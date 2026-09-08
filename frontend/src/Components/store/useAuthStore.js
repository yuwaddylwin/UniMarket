import { useSavedStore } from "./useSavedStore";
import { disableDevicePush } from "../Chat/push";
import { create } from "zustand";
import { axiosInstance, removeAuthToken, getAuthToken } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { API_ORIGIN } from "../../config/api";

const SOCKET_URL = API_ORIGIN;
let unreadRequestVersion = 0;


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
  socket: null,
  unreadCount: {}, // { userId: count }
  totalUnread: 0,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check", { timeout: 10000 }); // http://localhost:3000/api
      if (get().authUser?._id !== res.data._id) get().disconnectSocket();
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      get().disconnectSocket();
      removeAuthToken();
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      toast.success(res.data.message);
      return res.data;
    } catch (error) {
      console.log("Signup error:", error);
      toast.error(error.response?.data?.message || "Sign Up Failed!");
      throw error;
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      removeAuthToken();
      get().disconnectSocket();
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      // Socket
      get().connectSocket();
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login Failed!");
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
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
    set({ authUser: null });
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
      console.log("ERROR RESPONSE:", error.response);
      console.log("ERROR MESSAGE:", error.message);
      console.log("ERROR DATA:", error.response?.data);
      toast.error(error.response?.data?.message || "Something went wrong!");
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  updateAccount: async (data) => {
    set({ isUpdatingAccount: true });
    try {
      const res = await axiosInstance.patch("/auth/profile", { fullName: data.fullName });
      set({ authUser: res.data });
      toast.success("Profile settings updated");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update your profile. Please try again.");
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
      toast.error(error.response?.data?.message || "Unable to save preferences");
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
      toast.error(error.response?.data?.message || "Unable to remove profile photo");
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
      set({onlineUsers: userId})
    });

    const alertedMessages = new Set();
    newSocket.on("newMessage", (message) => {
      if (message?._id && alertedMessages.has(message._id)) return;
      if (message?._id) { alertedMessages.add(message._id); if (alertedMessages.size > 200) alertedMessages.delete(alertedMessages.values().next().value); }
      if (!message?.senderName || message.seen || (newSocket.chatPageActive && document.visibilityState === "visible")) return;
      const preferences = get().authUser?.preferences;
      if (preferences?.messages === false) return;
      toast.success(`${message.senderName} sent you a message`);
    });

    newSocket.on("connect", () => get().getUnreadCount());

    // Initialize unread count and subscribe to updates
    get().getUnreadCount();
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
      if (requestVersion !== unreadRequestVersion || get().authUser?._id !== userId) return;
      const unreadMap = {};
      res.data.byUser.forEach(item => {
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
