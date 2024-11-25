import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useUserStore = create((set, get) => ({
  user: null,
  loading: false,
  checkingAuth: true,

  signup: async (
    user_name,
    email,
    phone_number,
    user_password,
    confirmPassword
  ) => {
    set({ loading: true });

    if (user_password !== confirmPassword) {
      set({ loading: false });
      return toast.error("Password do not match");
    }

    try {
      const res = await axios.post("/auth/signup", {
        user_name,
        email,
        user_password,
        phone_number,
      });
      set({ user: res.data, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "An error occurred");
    }
  },

  login: async (email, user_password) => {
    set({ loading: true }); // Reset any previous errors
    try {
      const res = await axios.post("/auth/login", { email, user_password });
      set({ user: res.data, loading: false }); // Clear error on successful login
    } catch (error) {
      // Log the error for debugging
      set({ loading: false });
      toast.error(error.response.data.message || "An error occurred");
    }
  },

  logout: async () => {
    try {
      await axios.post("/auth/logout");
      set({ user: null, loading: false });
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "An error occurred");
    }
  },

  forgotPassword: async (email) => {
    set({ loading: true });
    try {
      const res = await axios.post("/auth/forgot-password", { email });
      set({ loading: false });
      toast.success(res.data.message || "Reset link sent to your email!");
      return res.data.message; // Return success message for display
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "An error occurred");
      return error.response.data.message; // Return error message for display
    }
  },

  resetPassword: async (resetToken, newPassword) => {
    set({ loading: true });
    try {
      const res = await axios.put("/auth/reset-password", {
        resetToken,
        newPassword,
      });
      set({ loading: false });
      toast.success(res.data.message || "Password reset successfully!");
      return res.data.message; // Return success message for display
    } catch (error) {
      set({ loading: false });
      toast.error(error.response.data.message || "An error occurred");
      return error.response.data.message; // Return error message for display
    }
  },

  checkAuth: async () => {
    set({ checkingAuth: true });
    try {
      const response = await axios.get("/auth/profile");
      set({ user: response.data, checkingAuth: false });
    } catch (error) {
      console.log(error.message);
      set({ checkingAuth: false, user: null, loading: false });
    }
  },

  refreshToken: async () => {
    // Prevent multiple simultaneous refresh attempts
    if (get().checkingAuth) return;

    set({ checkingAuth: true });
    try {
      const response = await axios.post("/auth/refresh-token");
      set({ checkingAuth: false });
      return response.data;
    } catch (error) {
      set({ user: null, checkingAuth: false });
      throw error;
    }
  },
}));

// TODO Implement the axios interceptors for refreshing access tokens
// Axios interceptor for token refresh
let refreshPromise = null;

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // If a refresh is already in progress, wait for it to complete
        if (refreshPromise) {
          await refreshPromise;
          return axios(originalRequest);
        }

        // Start a new refresh process
        refreshPromise = useUserStore.getState().refreshToken();
        await refreshPromise;
        refreshPromise = null;

        return axios(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login or handle as needed
        useUserStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
