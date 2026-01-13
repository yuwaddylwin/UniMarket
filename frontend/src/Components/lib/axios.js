import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: "https://unimarket-08di.onrender.com/api",
    withCredentials: true,
})