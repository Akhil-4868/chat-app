import { createContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create axios instance that doesn't share headers globally
  const createAxiosInstance = useCallback(() => {
    return axios.create({
      baseURL: backendUrl,
      timeout: 10000,
    });
  }, []);

  // Clear all auth data
  const clearAuthData = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [socket]);

  // Check if user is authenticated - FIXED
  const checkAuth = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    try {
      const axiosInstance = createAxiosInstance();
      const { data } = await axiosInstance.get("/api/auth/check", {
        headers: { token },
      });

      if (data?.success && data?.user) {
        setAuthUser(data.user);
        connectSocket(data.user);
      } else {
        // Only clear auth data if the response explicitly indicates invalid token
        if (
          data?.message?.includes("token") ||
          data?.message?.includes("Invalid")
        ) {
          console.log("Token invalid, clearing auth data");
          clearAuthData();
          toast.error("Session expired. Please login again.");
        } else {
          throw new Error(data?.message || "Authentication failed");
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);

      // Only clear auth data for specific token-related errors
      const isTokenError =
        error?.response?.status === 401 ||
        error?.response?.data?.message?.includes("token") ||
        error?.response?.data?.message?.includes("Invalid") ||
        error?.response?.data?.message?.includes("expired") ||
        error?.response?.data?.message?.includes("No token provided");

      if (isTokenError) {
        console.log("Token related error, clearing auth data");
        clearAuthData();
        toast.error("Session expired. Please login again.");
      } else {
        // For network errors or server issues, don't clear auth data
        console.log("Network/server error, keeping auth data");
        toast.error("Connection error. Please check your internet connection.");
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [token, clearAuthData, createAxiosInstance]);

  // Login/Signup - FIXED
  const login = async (state, credentials) => {
    if (!state || !credentials) {
      toast.error("Invalid login data");
      return;
    }

    try {
      setIsLoading(true);
      const axiosInstance = createAxiosInstance();
      const { data } = await axiosInstance.post(
        `/api/auth/${state}`,
        credentials
      );

      if (data?.success && data?.token && data?.userData) {
        // Set auth data
        setAuthUser(data.userData);
        setToken(data.token);
        localStorage.setItem("token", data.token);

        // Connect socket and emit user created event for new signups
        connectSocket(data.userData);

        if (state === "signup" && socket) {
          socket.emit("userCreated", data.userData);
        }

        toast.success(data.message || "Login successful");
      } else {
        throw new Error(data?.message || `${state} failed`);
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error?.response?.data?.message || error?.message || `${state} failed`;
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout - FIXED
  const logout = useCallback(() => {
    clearAuthData();
    toast.success("Logged out successfully");
  }, [clearAuthData]);

  // Update profile - FIXED
  const updateProfile = async (body) => {
    if (!body || !token) return;

    try {
      const axiosInstance = createAxiosInstance();
      const { data } = await axiosInstance.put(
        "/api/auth/update-profile",
        body,
        {
          headers: { token },
        }
      );

      if (data?.success && data?.user) {
        setAuthUser(data.user);

        // Emit user updated event via socket
        if (socket) {
          socket.emit("userUpdated", data.user);
        }

        toast.success(data.message || "Profile updated successfully");
      } else {
        throw new Error(data?.message || "Update failed");
      }
    } catch (error) {
      console.error("Update profile error:", error);

      // Only logout for specific token-related errors
      const isTokenError =
        error?.response?.status === 401 ||
        error?.response?.data?.message?.includes("token") ||
        error?.response?.data?.message?.includes("Invalid") ||
        error?.response?.data?.message?.includes("expired");

      if (isTokenError) {
        logout();
      } else {
        toast.error(error?.response?.data?.message || "Update failed");
      }
    }
  };

  // Connect socket - FIXED
  const connectSocket = useCallback(
    (userData) => {
      if (!userData?._id || socket?.connected) return;

      try {
        const newSocket = io(backendUrl, {
          query: { userId: userData._id },
          transports: ["websocket", "polling"],
          timeout: 20000,
        });

        setSocket(newSocket);

        newSocket.on("connect", () => {
          console.log("Socket connected:", newSocket.id);
        });

        newSocket.on("getOnlineUsers", (userIds) => {
          setOnlineUsers(Array.isArray(userIds) ? userIds : []);
        });

        newSocket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
        });

        newSocket.on("disconnect", (reason) => {
          console.log("Socket disconnected:", reason);
        });
      } catch (error) {
        console.error("Socket connection failed:", error);
      }
    },
    [socket, backendUrl]
  );

  // Check auth on mount and token change
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const value = {
    authUser,
    onlineUsers,
    socket,
    token, // Expose token so other contexts can use it
    createAxiosInstance, // Expose function to create axios instances
    isLoading,
    isInitialized, // Add this flag
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
