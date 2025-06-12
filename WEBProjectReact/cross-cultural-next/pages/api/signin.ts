// pages/api/signin.ts - Enhanced version with better error handling
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "../../utils/db";
import User from "../../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  console.log("📝 Signin attempt started");

  try {
    console.log("🔌 Connecting to MongoDB...");
    await connectToDatabase();
    console.log("✅ MongoDB connection successful");

    const { email, password } = req.body;
    console.log("📧 Email received:", email ? "✅" : "❌");
    console.log("🔐 Password received:", password ? "✅" : "❌");

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

    console.log("🔍 Searching for user with email:", email);
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({
        message: "Invalid credentials",
        success: false,
      });
    }

    console.log("✅ User found:", user._id);
    console.log("🔐 Password field exists:", !!user.password);
    console.log("🔐 Password length:", user.password ? user.password.length : 0);

    // Enhanced password validation
    if (!user.password || user.password.length === 0) {
      console.log("❌ User has no password set - possible account creation issue");
      
      // Log user creation info for debugging
      console.log("👤 User details:", {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
        role: user.role
      });
      
      return res.status(422).json({
        message: "Account setup is incomplete. This account needs to be reactivated.",
        code: "INCOMPLETE_ACCOUNT_SETUP",
        suggestion: "Please contact support or try registering again with this email.",
        success: false,
      });
    }

    // Check if password looks like a hash
    const isHashedPassword = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
    if (!isHashedPassword) {
      console.log("⚠️ Password doesn't appear to be hashed properly");
      return res.status(422).json({
        message: "Account has an invalid password format. Please contact support.",
        code: "INVALID_PASSWORD_FORMAT",
        success: false,
      });
    }

    console.log("🔐 Comparing passwords...");
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 Password comparison result:", isMatch ? "✅ MATCH" : "❌ NO MATCH");

    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(401).json({
        message: "Invalid credentials",
        success: false,
      });
    }

    console.log("✅ Password verified successfully");

    // Create JWT token
    console.log("🎫 Creating JWT token...");
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Prepare user response (exclude password)
    const userData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      country: user.country || null,
      destination: user.destination || null,
      phone: user.phone || null,
      educationalLevel: user.educationalLevel || null,
      fieldOfStudy: user.fieldOfStudy || null,
      bio: user.bio || null,
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
    
    // Enhanced error handling for different MongoDB issues
    if (error.name === 'MongoNetworkError' || error.message.includes('SSL')) {
      console.error("🔗 Network/SSL Error - MongoDB connection failed");
      return res.status(503).json({
        message: "Database connection failed",
        error: "Unable to connect to database. Please try again.",
        code: "DATABASE_CONNECTION_ERROR",
        success: false,
      });
    }
    
    if (error.name === 'MongoServerSelectionError') {
      console.error("🗄️ Server Selection Error - MongoDB server unavailable");
      return res.status(503).json({
        message: "Database server unavailable", 
        error: "Database server selection failed. Please try again.",
        code: "DATABASE_SERVER_ERROR",
        success: false,
      });
    }

    if (error.name === 'MongoTimeoutError') {
      console.error("⏰ Timeout Error - MongoDB operation timed out");
      return res.status(503).json({
        message: "Database operation timed out",
        error: "The request took too long. Please try again.",
        code: "DATABASE_TIMEOUT_ERROR",
        success: false,
      });
    }

    return res.status(500).json({
      message: "Internal server error during sign in",
      error: process.env.NODE_ENV === 'development' ? error.message : "Unknown error occurred",
      success: false,
    });
  }
}