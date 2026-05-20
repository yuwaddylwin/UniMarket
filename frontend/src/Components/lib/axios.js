import axios from "axios";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://unimarket-08di.onrender.com/api"
    : "http://localhost:8000/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("authToken", token);
  }
};

export const removeAuthToken = () => {
  localStorage.removeItem("authToken");
};

export const getAuthToken = () => localStorage.getItem("authToken");

axiosInstance.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});