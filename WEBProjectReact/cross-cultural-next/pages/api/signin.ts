// pages/api/signin.ts - Enhanced version with better error handling
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Enhanced MongoDB connection with better error handling
const connectMongo = async () => {
  if (mongoose.connections[0].readyState) {
    console.log("MongoDB already connected");
    return;
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected successfully");
    
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

// User Schema - Make sure this matches your actual User model
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['user', 'mentor', 'admin'], default: 'user' },
  country: String,
  educationalLevel: String,
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    appNotifications: { type: Boolean, default: true },
    resourceRecommendations: { type: Boolean, default: true },
    peerConnections: { type: Boolean, default: true }
  }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  console.log("📝 Signin attempt started");

  try {
    // Connect to the database
    console.log("🔌 Connecting to MongoDB...");
    await connectMongo();
    console.log("✅ MongoDB connection successful");

    const { email, password } = req.body;
    console.log("📧 Email received:", email ? "✅" : "❌");
    console.log("🔐 Password received:", password ? "✅" : "❌");

    // Validate input
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({
        message: "Email and password are required",
        success: false,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format");
      return res.status(400).json({
        message: "Invalid email format",
        success: false,
      });
    }

    // Find the user in the database
    console.log("🔍 Searching for user with email:", email);
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        success: false,
      });
    }

    console.log("✅ User found:", user._id);

    // Verify password exists
    if (!user.password) {
      console.log("❌ User has no password set");
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS", 
        success: false,
      });
    }

    // Compare the provided password with the stored hash
    console.log("🔐 Comparing passwords...");
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        success: false,
      });
    }

    console.log("✅ Password verified");

    // Create a JWT token
    console.log("🎫 Creating JWT token...");
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    console.log("✅ JWT token created");

    // Return user data and token (excluding password)
    const userData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      country: user.country || null,
      educationalLevel: user.educationalLevel || null,
      preferences: user.preferences || {
        emailNotifications: true,
        appNotifications: true,
        resourceRecommendations: true,
        peerConnections: true
      }
    };

    console.log("✅ Signin successful for user:", user._id);

    return res.status(200).json({
      message: "Sign in successful",
      user: userData,
      token,
      success: true,
    });

  } catch (error: any) {
    console.error("❌ Sign In Error:", error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongoNetworkError') {
      return res.status(503).json({
        message: "Database connection failed",
        error: "Unable to connect to database",
        success: false,
      });
    }
    
    if (error.name === 'MongoServerSelectionError') {
      return res.status(503).json({
        message: "Database server unavailable",
        error: "Database server selection failed",
        success: false,
      });
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(500).json({
        message: "Token generation failed",
        error: "JWT configuration error",
        success: false,
      });
    }

    // Generic error response
    return res.status(500).json({
      message: "Internal server error during sign in",
      error: process.env.NODE_ENV === 'development' ? error.message : "Unknown error occurred",
      success: false,
    });
  }
}