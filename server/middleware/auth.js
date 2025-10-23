import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const protectedRoute = async (req, res, next) => {
  try {
    // Check for token in multiple places
    const token =
      req.headers.token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token with proper error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Find user and check if exists
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Protected route error:", error);
    res.status(500).json({
      success: false,
      message: "Server error in authentication",
    });
  }
};
