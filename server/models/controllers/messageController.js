// messageController.js - Fixed
import User from "../User.js";
import Message from "../Message.js";
import cloudinary from "../../lib/cloudinary.js";
import { io, userSocketMap } from "../../server.js";

// Get all users except the logged in user
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const filteredUsers = await User.find({ _id: { $ne: userId } }).select(
      "-password"
    );

    // Count number of messages not seen
    const unseenMessages = {};
    const promises = filteredUsers.map(async (user) => {
      try {
        const messages = await Message.find({
          senderId: user._id,
          receiverId: userId,
          seen: false,
        });
        if (messages.length > 0) {
          unseenMessages[user._id] = messages.length;
        }
      } catch (error) {
        console.error(
          `Error counting unseen messages for user ${user._id}:`,
          error
        );
      }
    });

    await Promise.all(promises);

    res.json({
      success: true,
      users: filteredUsers || [],
      unseenMessages: unseenMessages || {},
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};

// Get all messages for selected user
export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user?._id;

    if (!selectedUserId || !myId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user IDs",
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // Mark messages as seen
    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId, seen: false },
      { seen: true }
    );

    res.json({
      success: true,
      messages: messages || [],
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};

// API to mark message as seen using message id
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Message ID required",
      });
    }

    const message = await Message.findByIdAndUpdate(
      id,
      { seen: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error("Mark message as seen error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};

// Send message to selected User
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params?.id;
    const senderId = req.user?._id;

    if (!receiverId || !senderId) {
      return res.status(400).json({
        success: false,
        message: "Invalid sender or receiver ID",
      });
    }

    if (!text && !image) {
      return res.status(400).json({
        success: false,
        message: "Message text or image required",
      });
    }

    let imageUrl;
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse?.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: text || "",
      image: imageUrl,
    });

    // Emit the new message to the receiver's socket
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId && io) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.json({
      success: true,
      newMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};
