import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { AuthContext } from "./AuthContext.jsx";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [isUsersLoaded, setIsUsersLoaded] = useState(false);

  const authContext = useContext(AuthContext);
  const { socket, authUser, token, createAxiosInstance, isInitialized } =
    authContext || {};

  // Create axios instance with current user's token
  const getAxiosWithAuth = useCallback(() => {
    if (!createAxiosInstance || !token) return null;

    const axiosInstance = createAxiosInstance();
    // Set the token for this specific request, not globally
    return {
      ...axiosInstance,
      get: (url, config = {}) =>
        axiosInstance.get(url, {
          ...config,
          headers: { ...config.headers, token },
        }),
      post: (url, data, config = {}) =>
        axiosInstance.post(url, data, {
          ...config,
          headers: { ...config.headers, token },
        }),
      put: (url, data, config = {}) =>
        axiosInstance.put(url, data, {
          ...config,
          headers: { ...config.headers, token },
        }),
      delete: (url, config = {}) =>
        axiosInstance.delete(url, {
          ...config,
          headers: { ...config.headers, token },
        }),
    };
  }, [createAxiosInstance, token]);

  // Function to get all users for sidebar - FIXED with better error handling
  const getUsers = useCallback(
    async (showToast = false) => {
      const axios = getAxiosWithAuth();
      if (!axios || !authUser) {
        return;
      }

      try {
        const { data } = await axios.get("/api/messages/users");
        if (data?.success) {
          setUsers(data.users || []);
          setUnseenMessages(data.unseenMessages || {});
          setIsUsersLoaded(true);

          if (showToast) {
            console.log("Users refreshed successfully");
          }
        } else {
          throw new Error(data?.message || "Failed to fetch users");
        }
      } catch (error) {
        console.error("Get users error:", error);
        // Don't show toast for network errors or 401 errors during background refreshes
        if (error?.response?.status !== 401 && showToast) {
          toast.error("Failed to fetch users");
        }
      }
    },
    [getAxiosWithAuth, authUser]
  );

  // Function to refresh users - can be called manually
  const refreshUsers = useCallback(() => {
    getUsers(true);
  }, [getUsers]);

  // Function to get messages for selected user - FIXED
  const getMessages = useCallback(
    async (userId) => {
      const axios = getAxiosWithAuth();
      if (!axios || !userId) return;

      try {
        const { data } = await axios.get(`/api/messages/${userId}`);
        if (data?.success) {
          setMessages(data.messages || []);
        } else {
          throw new Error(data?.message || "Failed to fetch messages");
        }
      } catch (error) {
        console.error("Get messages error:", error);
        if (error?.response?.status !== 401) {
          toast.error("Failed to fetch messages");
        }
      }
    },
    [getAxiosWithAuth]
  );

  // Function to send message to selected user - FIXED
  const sendMessage = useCallback(
    async (messageData) => {
      const axios = getAxiosWithAuth();
      if (!axios || !selectedUser?._id) return;

      try {
        const { data } = await axios.post(
          `/api/messages/send/${selectedUser._id}`,
          messageData
        );
        if (data?.success) {
          setMessages((prevMessages) => [...prevMessages, data.newMessage]);
          return { success: true, message: data.newMessage };
        } else {
          throw new Error(data?.message || "Failed to send message");
        }
      } catch (error) {
        console.error("Send message error:", error);
        if (error?.response?.status !== 401) {
          toast.error("Failed to send message");
        }
        return { success: false };
      }
    },
    [getAxiosWithAuth, selectedUser]
  );

  // Function to subscribe to messages and user updates - FIXED
  const subscribeToMessages = useCallback(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      if (!newMessage) return;

      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);

        // Mark message as seen
        const axios = getAxiosWithAuth();
        if (axios && newMessage._id) {
          axios
            .put(`/api/messages/mark/${newMessage._id}`)
            .catch(console.error);
        }
      } else {
        setUnseenMessages((prevUnseenMessages) => ({
          ...prevUnseenMessages,
          [newMessage.senderId]:
            (prevUnseenMessages[newMessage.senderId] || 0) + 1,
        }));
      }
    };

    const handleUserCreated = (newUserData) => {
      console.log("New user created:", newUserData);
      // Add the new user to the users list immediately
      if (newUserData && newUserData._id !== authUser?._id) {
        setUsers((prevUsers) => {
          // Check if user already exists to avoid duplicates
          const userExists = prevUsers.some(
            (user) => user._id === newUserData._id
          );
          if (!userExists) {
            return [...prevUsers, newUserData];
          }
          return prevUsers;
        });
      }
    };

    const handleUserUpdated = (updatedUserData) => {
      console.log("User updated:", updatedUserData);
      // Update users list when a user profile is updated
      if (updatedUserData) {
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === updatedUserData._id ? updatedUserData : user
          )
        );

        // Also update selectedUser if it's the updated user
        if (selectedUser && selectedUser._id === updatedUserData._id) {
          setSelectedUser(updatedUserData);
        }
      }
    };

    // Subscribe to events
    socket.on("newMessage", handleNewMessage);
    socket.on("userCreated", handleUserCreated);
    socket.on("userUpdated", handleUserUpdated);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("userCreated", handleUserCreated);
      socket.off("userUpdated", handleUserUpdated);
    };
  }, [socket, selectedUser, getAxiosWithAuth, authUser]);

  // Subscribe to messages effect
  useEffect(() => {
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [subscribeToMessages]);

  // Load users when auth is ready
  useEffect(() => {
    if (authUser && token && isInitialized && !isUsersLoaded) {
      getUsers();
    }
  }, [authUser, token, isInitialized, isUsersLoaded, getUsers]);

  // Refresh users when coming back online or window focus
  useEffect(() => {
    const handleOnline = () => {
      if (authUser && token) {
        refreshUsers();
      }
    };

    const handleFocus = () => {
      if (authUser && token) {
        refreshUsers();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
    };
  }, [authUser, token, refreshUsers]);

  // Clear unseen messages when selecting a user
  useEffect(() => {
    if (selectedUser?._id && unseenMessages[selectedUser._id]) {
      setUnseenMessages((prev) => ({
        ...prev,
        [selectedUser._id]: 0,
      }));
    }
  }, [selectedUser]);

  // Reset state when auth user changes
  useEffect(() => {
    if (!authUser) {
      setMessages([]);
      setUsers([]);
      setSelectedUser(null);
      setUnseenMessages({});
      setIsUsersLoaded(false);
    }
  }, [authUser]);

  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    getMessages,
    setMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
    refreshUsers,
    isUsersLoaded,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
