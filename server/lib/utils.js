import jwt from "jsonwebtoken";

export const generateToken = (userId) => {
  if (!userId) {
    throw new Error("User ID is required for token generation");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  // Add additional claims to make tokens more unique
  const payload = {
    id: userId,
    iat: Math.floor(Date.now() / 1000), // Issued at time
    // Add a random component to make each token unique
    jti:
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15),
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
    issuer: "chat-app", // Add issuer for additional security
    audience: "chat-app-users", // Add audience for additional security
  });
};

// Optional: Function to verify token (can be used in middleware)
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "chat-app",
      audience: "chat-app-users",
    });
  } catch (error) {
    throw error;
  }
};
