import axios from "axios";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://unimarket-08di.onrender.com/api"
    : "http://localhost:8000/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});