// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRouter.js";
import messageRouter from "./routes/messageRouter.js";

dotenv.config();

const app = express();
const server = createServer(app);

// ✅ Allowed origins (both dev & prod)
const allowedOrigins = [
  "http://localhost:5173", // Dev frontend
  "https://chat-app-mu-silk-15.vercel.app", // Prod frontend
];

// ✅ Middleware
app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow tools like Postman
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "token", "Authorization"],
  })
);

// ✅ Socket.io setup
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

export const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  const userId = socket.handshake.query?.userId;
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
    console.log(`User ${userId} mapped to socket ${socket.id}`);
  }

  // Send list of online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("userCreated", (newUserData) => {
    console.log("Broadcasting new user created:", newUserData);
    socket.broadcast.emit("userCreated", newUserData);
  });

  socket.on("userUpdated", (updatedUserData) => {
    console.log("Broadcasting user updated:", updatedUserData);
    socket.broadcast.emit("userUpdated", updatedUserData);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    for (const [uid, socketId] of Object.entries(userSocketMap)) {
      if (socketId === socket.id) {
        delete userSocketMap[uid];
        break;
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// ✅ Routes
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

app.get("/", (req, res) => {
  res.json({ message: "Chat App Backend Running!" });
});

// ✅ Global error handler
app.use((error, req, res, next) => {
  console.error("Global error:", error);
  res.status(500).json({
    success: false,
    message: error?.message || "Internal server error",
  });
});

// ✅ Initialize
const init = async () => {
  try {
    await connectDB();

    if (process.env.NODE_ENV !== "production") {
      const PORT = process.env.PORT || 5000;
      server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error("Failed to initialize server:", error);
  }
};

init();

// ✅ Export server for Vercel
export default server;
