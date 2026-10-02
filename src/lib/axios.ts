import type { InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import Cookies from "js-cookie";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const instance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = Cookies.get("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("auth_token");
      Cookies.remove("auth_type");
      Cookies.remove("auth_user");

      const currentPath = window.location.pathname;
      const isProtectedRoute = 
        currentPath.startsWith("/admin") ||
        currentPath.startsWith("/doctor") ||
        currentPath === "/";
      
      if (isProtectedRoute && currentPath !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default instance;
