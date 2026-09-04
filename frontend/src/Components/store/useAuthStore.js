import { create } from "zustand";
import { axiosInstance, setAuthToken, removeAuthToken, getAuthToken } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "https://unimarket-08di.onrender.com"
    : "http://localhost:8000";


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
      const token = getAuthToken();
      if (!token) {
        set({ authUser: null });
        return;
      }

      const res = await axiosInstance.get("/auth/check"); // http://localhost:3000/api
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
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
      const { token, ...user } = res.data;
      setAuthToken(token);
      set({ authUser: user });
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
      await axiosInstance.post("/auth/logout");
      removeAuthToken();
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout Failed!");
    }
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
      query: {
        userId: authUser._id,
      },
      withCredentials: true,
      transports: ["websocket"],
    });

    set({ socket: newSocket });

    newSocket.on("getOnlineUsers", (userId) => {
      set({onlineUsers: userId})
    });

    newSocket.on("newMessage", (message) => {
      if (!message?.senderName) return;
      const preferences = get().authUser?.preferences;
      if (preferences?.messages === false || preferences?.notifications === false) return;
      toast.success(`${message.senderName} sent you a message`);
    });

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
  },

  getUnreadCount: async () => {
    try {
      const { axiosInstance } = await import("../lib/axios.js");
      const res = await axiosInstance.get("/messages/unread/count");
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

    socket.on("unreadCountUpdate", ({ senderId, unreadCount }) => {
      set((state) => {
        const newUnreadCount = { ...state.unreadCount };
        newUnreadCount[senderId] = (newUnreadCount[senderId] || 0) + unreadCount;
        const totalUnread = Object.values(newUnreadCount).reduce((sum, count) => sum + count, 0);
        
        return {
          unreadCount: newUnreadCount,
          totalUnread,
        };
      });
    });

    socket.on("messagesSeen", ({ userId }) => {
      set((state) => {
        const newUnreadCount = { ...state.unreadCount };
        delete newUnreadCount[userId];
        const totalUnread = Object.values(newUnreadCount).reduce((sum, count) => sum + count, 0);
        
        return {
          unreadCount: newUnreadCount,
          totalUnread,
        };
      });
    });
  },

  unsubscribeFromUnreadUpdates: () => {
    const socket = get().socket;
    if (!socket) return;
    socket.off("unreadCountUpdate");
    socket.off("messagesSeen");
  },
  
}));
