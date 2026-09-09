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

export function validateApiResponse(response) {
  if (/text\/html/i.test(response.headers?.['content-type'] || '') ||
      (typeof response.data === 'string' && /^\s*(?:<!doctype\s+html|<html)/i.test(response.data))) {
    throw Object.assign(new Error('UniMarket received a web page instead of API data. The frontend API proxy needs to be configured.'), { code: 'API_HTML_RESPONSE' });
  }
  return response;
}
axiosInstance.interceptors.response.use(validateApiResponse, error => {
  if (error.response) validateApiResponse(error.response);
  return Promise.reject(error);
});
