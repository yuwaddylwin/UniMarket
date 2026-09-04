import axios from "axios";
import { API_BASE_URL } from "../../config/api";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
