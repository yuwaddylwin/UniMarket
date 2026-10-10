import { useSavedStore } from "./useSavedStore";
import { disableDevicePush } from "../Components/Chat/push";
import { create } from "zustand";
import { axiosInstance, removeAuthToken, getAuthToken } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { API_ORIGIN } from "../config/api";

const SOCKET_URL = API_ORIGIN || undefined;
let unreadRequestVersion = 0;
let authVersion = 0;
let authRequest = null;
let authController = null;
function invalidateAuthChecks() {
  authController?.abort();
  authController = null;
  authVersion += 1;
  authRequest = null;
}

export const useAuthStore = create((set, get) => ({
  authUser: null,
  onlineUsers: [],
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isUpdatingAccount: false,
  isUpdatingPreferences: false,
  isRemovingProfilePhoto: false,
  isCheckingAuth: true,
  hasInitialized: false,
  socket: null,
  unreadCount: {}, // { userId: count }
  totalUnread: 0,

  authError: null,
  invalidateAuthChecks,
  acceptSession: (user) => {
    if (!user?._id) throw new Error("Invalid session response");
    invalidateAuthChecks();
    removeAuthToken();
    if (get().authUser?._id !== user._id) get().disconnectSocket();
    set({
      authUser: user,
      authError: null,
      isCheckingAuth: false,
      hasInitialized: true,
    });
    get().connectSocket();
  },
  checkAuth: (options = {}) => {
    if (options?.fresh) invalidateAuthChecks();
    if (authRequest) return authRequest;
    const version = authVersion;
    const controller = new AbortController();
    authController = controller;
    set({ isCheckingAuth: true, authError: null });
    const request = (async () => {
      try {
        const res = await axiosInstance.get("/auth/check", {
          timeout: 20000,
          signal: controller.signal,
        });
        if (!res.data?._id)
          throw Object.assign(new Error("Invalid session response from the API."), {
            code: "INVALID_SESSION",
          });
        if (version !== authVersion) return get().authUser;
        if (get().authUser?._id !== res.data._id) get().disconnectSocket();
        set({ authUser: res.data, authError: null, hasInitialized: true });
        get().connectSocket();
        return res.data;
      } catch (error) {
        if (version !== authVersion) return get().authUser;
        if (
          error.response?.status === 401 ||
          (error.response?.status === 404 &&
            error.response?.data?.message === "User not found")
        ) {
          get().disconnectSocket();
          removeAuthToken();
          set({ authUser: null, authError: null, hasInitialized: true });
          return null;
        }
        set({
          authError:
            error.code === "API_HTML_RESPONSE"
              ? error.message
              : ["ECONNABORTED", "ETIMEDOUT"].includes(error.code)
                ? "UniMarket is taking longer than expected to respond. Please retry."
                : "Unable to check your session. Check your connection and retry.",
        });
        return null;
      }
    })();
    authRequest = request;
    request.finally(() => {
      if (version === authVersion) set({ isCheckingAuth: false });
      if (authRequest === request) {
        authRequest = null;
        authController = null;
      }
    });
    return request;
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      toast.success(res.data.message);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Sign Up Failed!");
      throw error;
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    invalidateAuthChecks();
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      get().acceptSession(res.data);
      toast.success("Logged in successfully");

      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login Failed!");
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    invalidateAuthChecks();
    try {
      await disableDevicePush().catch(() => {});
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error("Unable to sign out. Check your connection and try again.");
        return;
      }
    }
    removeAuthToken();
    get().disconnectSocket();
    invalidateAuthChecks();
    set({ authUser: null, authError: null, isCheckingAuth: false });
    const { useChatStore } = await import("./useChatStore");
    useChatStore.getState().setSelectedUser(null);
    useChatStore.setState({ users: [] });
    toast.success("Logged out successfully");
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.post("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong!");
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  updateAccount: async (data) => {
    set({ isUpdatingAccount: true });
    try {
      const res = await axiosInstance.patch("/auth/profile", {
        fullName: data.fullName,
      });
      set({ authUser: res.data });
      toast.success("Profile settings updated");
      return res.data;
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to update your profile. Please try again."
      );
      throw error;
    } finally {
      set({ isUpdatingAccount: false });
    }
  },

  updatePreferences: async (preferences) => {
    set({ isUpdatingPreferences: true });
    try {
      const res = await axiosInstance.patch("/auth/preferences", preferences);
      set({ authUser: res.data });
      toast.success("Preferences saved");
      return res.data;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to save preferences"
      );
      throw error;
    } finally {
      set({ isUpdatingPreferences: false });
    }
  },

  removeProfilePhoto: async () => {
    set({ isRemovingProfilePhoto: true });
    try {
      const res = await axiosInstance.delete("/auth/profile-photo");
      set({ authUser: res.data });
      toast.success("Profile photo removed");
      return res.data;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to remove profile photo"
      );
      throw error;
    } finally {
      set({ isRemovingProfilePhoto: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || socket) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token: getAuthToken() },
      withCredentials: true,
      transports: ["websocket"],
    });

    set({ socket: newSocket });

    newSocket.on("getOnlineUsers", (userId) => {
      set({ onlineUsers: userId });
    });

    const alertedMessages = new Set();
    newSocket.on("newMessage", (message) => {
      if (message?._id && alertedMessages.has(message._id)) return;
      if (message?._id) {
        alertedMessages.add(message._id);
        if (alertedMessages.size > 200)
          alertedMessages.delete(alertedMessages.values().next().value);
      }
      if (
        !message?.senderName ||
        message.seen ||
        (newSocket.chatPageActive && document.visibilityState === "visible")
      )
        return;
      const preferences = get().authUser?.preferences;
      if (preferences?.messages === false) return;
      toast.success(`${message.senderName} sent you a message`);
    });

    newSocket.on("connect", () => get().getUnreadCount());

    // Initialize unread count and subscribe to updates
    get().subscribeToUnreadUpdates();
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }
    get().unsubscribeFromUnreadUpdates();
    unreadRequestVersion += 1;
    set({ socket: null, onlineUsers: [], unreadCount: {}, totalUnread: 0 });
  },

  getUnreadCount: async () => {
    const requestVersion = ++unreadRequestVersion;
    const userId = get().authUser?._id;
    try {
      const { axiosInstance } = await import("../lib/axios.js");
      const res = await axiosInstance.get("/messages/unread/count");
      if (
        requestVersion !== unreadRequestVersion ||
        get().authUser?._id !== userId
      )
        return;
      const unreadMap = {};
      res.data.byUser.forEach((item) => {
        unreadMap[item.userId] = item.count;
      });
      set({ unreadCount: unreadMap, totalUnread: res.data.total });
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  },

  subscribeToUnreadUpdates: () => {
    const socket = get().socket;
    if (!socket) return;

    socket.on("unreadCountUpdate", () => get().getUnreadCount());

    socket.on("unreadChanged", () => get().getUnreadCount());
    socket.on("chatDeleted", () => get().getUnreadCount());
  },

  unsubscribeFromUnreadUpdates: () => {
    const socket = get().socket;
    if (!socket) return;
    socket.off("unreadCountUpdate");
    socket.off("unreadChanged");
    socket.off("chatDeleted");
  },
}));

// Reset account-specific saved state immediately on login, logout, or account change.
useAuthStore.subscribe((state, previous) => {
  if (state.authUser?._id !== previous.authUser?._id) {
    useSavedStore.getState().setUser(state.authUser?._id || null);
  }
});
