import {create} from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useAuthStore = create((set)=>({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,

    isCheckingAuth: true,

    checkAuth: async() =>{
        try{
            const res = await axiosInstance.get("/auth/check");  // http://localhost:3000/api 

            set({authUser:res.data})
        }catch(error){
            console.log("Error in checkAuth:" , error);
            set({authUser: null});
        }finally{
            set({isCheckingAuth: false});
        }
    },

    signup: async (data) => {
    set({ isSigningUp: true });
    try {
        const res = await axiosInstance.post("/auth/signup", data);
        set({ authUser: res.data });
        console.log("Signup response:", res.data);
        toast.success("Account created successfully");
    } catch (error) {
        console.log("Signup error:", error);
        toast.error(error.response?.data?.message || "Sign Up Failed!");
    } finally {
        set({ isSigningUp: false });
    }
}

}));