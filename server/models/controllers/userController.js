// userController.js - FIXED
import User from "../User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../../lib/utils.js";
import cloudinary from "../../lib/cloudinary.js";

// Signup a new user - FIXED
export const signup = async (req, res) => {
  try {
    const { fullName, email, password, bio } = req.body;

    // Input validation
    if (!fullName || !email || !password || !bio) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      bio: bio.trim(),
    });

    // Generate token
    const token = generateToken(newUser._id);

    // Remove password from response
    const userResponse = {
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      bio: newUser.bio,
      profilePic: newUser.profilePic,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    res.status(201).json({
      success: true,
      userData: userResponse,
      token,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
};

// Login user - FIXED
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user with case-insensitive email
    const userData = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!userData) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, userData.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(userData._id);

    // Remove password from response
    const userResponse = {
      _id: userData._id,
      fullName: userData.fullName,
      email: userData.email,
      bio: userData.bio,
      profilePic: userData.profilePic,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    };

    res.json({
      success: true,
      userData: userResponse,
      token,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Check Auth - FIXED
export const checkAuth = async (req, res) => {
  try {
    // User is already verified by protectedRoute middleware
    const userResponse = {
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      bio: req.user.bio,
      profilePic: req.user.profilePic,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    };

    res.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("Check auth error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during auth check",
    });
  }
};

// Update Profile - FIXED
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;
    const userId = req.user._id;

    // Input validation
    if (!fullName || !bio) {
      return res.status(400).json({
        success: false,
        message: "Full name and bio are required",
      });
    }

    let updatedUser;

    if (!profilePic) {
      // Update without profile picture
      updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          bio: bio.trim(),
          fullName: fullName.trim(),
        },
        { new: true }
      ).select("-password");
    } else {
      // Update with profile picture
      try {
        const upload = await cloudinary.uploader.upload(profilePic);
        updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            profilePic: upload.secure_url,
            bio: bio.trim(),
            fullName: fullName.trim(),
          },
          { new: true }
        ).select("-password");
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile picture",
        });
      }
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during profile update",
    });
  }
};
