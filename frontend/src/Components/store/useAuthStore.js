import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const API_BASE = process.env.REACT_APP_API_BASE_URL;


export const useAuthStore = create((set, get) => ({
  authUser: null,
  onlineUsers: [],
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check"); // http://localhost:3000/api
      set({ authUser: res.data });
      get().connectSocket()
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      console.log("Signup response:", res.data);
      toast.success("Account created successfully");

      get().connectSocket()
    } catch (error) {
      console.log("Signup error:", error);
      toast.error(error.response?.data?.message || "Sign Up Failed!");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      // Socket
      get().connectSocket()
    } catch (error) {
      toast.error(error.response?.data?.message || "Login Failed!");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null});
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
    } catch (error) {
      console.log("ERROR RESPONSE:", error.response);
      console.log("ERROR MESSAGE:", error.message);
      console.log("ERROR DATA:", error.response?.data);
      toast.error(error.response?.data?.message || "Something went wrong!");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || socket) return;

    const newSocket = io(API_BASE, {
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
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
  },
  
}));
