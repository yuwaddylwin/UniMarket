import {create} from "zustand";
import toast from "react-hot-toast";
import {axiosInstance} from "../lib/axios";

export const useChatStore = create((set,get) =>({
    messages: [],
    users: [],
    onlineUsers: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,

    getUsers: async () =>{
        set({ isUsersLoading: true});
        try{
            const res = await axiosInstance.get("/messages/users");
            set({ users: res.data});
        }catch(error){
            toast.error(error.response?.data?.message || "Failed to load users");
        }finally{
            set({ isUsersLoading: false});
        }
    },

    getMessages: async(userId) => {
        set({ isMessagesLoading: true});
        try{
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data});
        }catch(error){
            toast.error(error.response?.data?.message || "Failed to get messages");
        }finally{
            set({ isMessagesLoading: false});
        }
    },

    sendMessage: async(messageData) => {
        const {selectedUser, messages} = get()
        try{
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            set({messages: [...messages, res.data]})
        }catch(error){
            toast.error(error.response?.data?.message || "Failed to send messages");
        }
    },

    markMessagesAsSeen: async (userId) => {
        await axiosInstance.post(`/messages/seen/${userId}`);

        set((state) => ({
            messages: state.messages.map((msg) =>
            msg.senderId === userId ? { ...msg, seen: true } : msg
            ),
        }));
},



    // Optimize this one later
    setSelectedUser: (selectedUser) =>
    set({
      selectedUser,
      messages: [],
    }),

    setOnlineUsers: (users) => set({ onlineUsers: users }),
}))