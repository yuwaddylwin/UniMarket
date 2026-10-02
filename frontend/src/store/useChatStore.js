import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  messagesVersion: 0,
  users: [],
  onlineUsers: [],
  blockedByMe: false,
  messagingBlocked: false,
  safetyLoading: false,
  safetyError: "",
  safetyRequest: 0,
  getSafety: async (id) => {
    const request = get().safetyRequest + 1;
    const accountId = useAuthStore.getState().authUser?._id;
    set({
      safetyRequest: request,
      safetyLoading: true,
      safetyError: "",
      messagingBlocked: false,
      blockedByMe: false,
    });
    const isCurrent = () =>
      get().selectedUser?._id === id &&
      get().safetyRequest === request &&
      useAuthStore.getState().authUser?._id === accountId;
    try {
      const { data } = await axiosInstance.get(`/messages/safety/${id}`, {
        timeout: 10000,
      });
      if (
        typeof data?.blockedByMe !== "boolean" ||
        typeof data?.messagingBlocked !== "boolean"
      ) {
        throw new Error("Invalid messaging availability response");
      }
      if (isCurrent())
        set({
          blockedByMe: data.blockedByMe,
          messagingBlocked: data.messagingBlocked,
          safetyLoading: false,
        });
    } catch {
      // Unknown status must not retain a previously blocked conversation.
      // The send API remains the authority for enforcement.
      if (isCurrent())
        set({
          safetyLoading: false,
          safetyError:
            "Could not check messaging availability. You can still try sending a message.",
        });
    }
  },
  applySafety: (id, data) => {
    if (get().selectedUser?._id !== id) return;
    if (
      typeof data?.blockedByMe !== "boolean" ||
      typeof data?.messagingBlocked !== "boolean"
    ) {
      return get().getSafety(id);
    }
    set({
      blockedByMe: data.blockedByMe,
      messagingBlocked: data.messagingBlocked,
      safetyLoading: false,
      safetyError: "",
      safetyRequest: get().safetyRequest + 1,
    });
  },
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getUserById: async (userId) => {
    const currentUserId = useAuthStore.getState().authUser?._id;
    if (currentUserId && String(currentUserId) === String(userId)) {
      throw new Error("You cannot chat with yourself");
    }
    const res = await axiosInstance.get(`/messages/users/${userId}`);
    return res.data;
  },

  getMessages: async (userId) => {
    const currentUserId = useAuthStore.getState().authUser?._id;
    if (currentUserId && String(currentUserId) === String(userId)) {
      set({ messages: [], selectedUser: null });
      return;
    }
    const version = get().messagesVersion;
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      if (
        get().selectedUser?._id === userId &&
        get().messagesVersion === version
      )
        set((state) => ({
          messages: [
            ...new Map(
              [...res.data, ...state.messages].map((m) => [m._id, m])
            ).values(),
          ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to get messages");
    } finally {
      if (get().selectedUser?._id === userId) set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const currentUserId = useAuthStore.getState().authUser?._id;
    if (
      !selectedUser?._id ||
      String(currentUserId) === String(selectedUser._id)
    ) {
      toast.error("You cannot chat with yourself");
      return;
    }
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set((state) => ({
        messages:
          state.selectedUser?._id === selectedUser._id &&
          !state.messages.some((m) => m._id === res.data._id)
            ? [...state.messages, res.data]
            : state.messages,
        // A newly messaged person becomes a conversation immediately.
        users: state.users.some((user) => user._id === selectedUser._id)
          ? state.users
          : [selectedUser, ...state.users],
      }));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send messages");
      return false;
    }
  },

  markMessagesAsSeen: async (userId, messageIds) => {
    if (!messageIds.length) return;
    try {
      const { data } = await axiosInstance.post(`/messages/seen/${userId}`, {
        messageIds,
      });
      if (data.messageIds.length)
        set((state) => ({
          messages: state.messages.map((m) =>
            data.messageIds.includes(m._id)
              ? { ...m, seen: true, seenAt: data.seenAt }
              : m
          ),
        }));
      await useAuthStore.getState().getUnreadCount();
    } catch {
      /* Preserve unread state for the next visibility retry. */
    }
  },
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    const receive = (message) => {
      const partner = get().selectedUser?._id;
      if (message.senderId !== partner && message.receivedId !== partner)
        return;
      set((state) => ({
        messages: state.messages.some((m) => m._id === message._id)
          ? state.messages
          : [...state.messages, message],
      }));
      get().getUsers();
    };
    const seen = ({ messageIds, seenAt }) =>
      set((state) => ({
        messages: state.messages.map((m) =>
          messageIds.includes(m._id) ? { ...m, seen: true, seenAt } : m
        ),
      }));
    const blocked = ({ userId }) => {
      if (get().selectedUser?._id === userId) get().getSafety(userId);
    };
    const deleted = ({ userId }) => {
      if (get().selectedUser?._id === userId)
        set((state) => ({
          messages: [],
          messagesVersion: state.messagesVersion + 1,
        }));
      get().getUsers();
      useAuthStore.getState().getUnreadCount();
    };
    const reconnect = () => {
      const id = get().selectedUser?._id;
      if (id) {
        set({ messages: [] });
        get().getMessages(id);
        get().getSafety(id);
      }
    };
    socket.on("newMessage", receive);
    socket.on("messageSent", receive);
    socket.on("messagesSeen", seen);
    socket.on("blockChanged", blocked);
    socket.on("chatDeleted", deleted);
    socket.on("connect", reconnect);
    set({
      messageCleanup: () => {
        socket.off("newMessage", receive);
        socket.off("messageSent", receive);
        socket.off("messagesSeen", seen);
        socket.off("blockChanged", blocked);
        socket.off("chatDeleted", deleted);
        socket.off("connect", reconnect);
      },
    });
  },
  unsubscribeFromMessages: () => {
    get().messageCleanup?.();
  },

  setSelectedUser: (selectedUser) =>
    set({
      selectedUser,
      messagesVersion: get().messagesVersion + 1,
      messages: [],
      safetyLoading: false,
      safetyError: "",
      safetyRequest: get().safetyRequest + 1,
      blockedByMe: false,
      messagingBlocked: false,
    }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),
}));
