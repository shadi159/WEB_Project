// pages/api/reset-incomplete-account.ts - API to fix accounts with missing passwords
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../../utils/db";
import User from "../../models/User";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  console.log("🔧 Account reset attempt started");

  try {
    await connectToDatabase();
    console.log("✅ MongoDB connection successful");

    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        message: "Email and new password are required",
        success: false,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        success: false,
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
        success: false,
      });
    }

    console.log("🔍 Looking for user with incomplete account:", email);
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Check if user already has a valid password
    if (user.password && user.password.length > 0 && 
        (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      return res.status(400).json({
        message: "Account already has a valid password. Use regular sign in.",
        success: false,
      });
    }

    console.log("🔐 Hashing new password...");
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log("💾 Updating user with new password...");
    await User.findByIdAndUpdate(user._id, {
      $set: { password: hashedPassword }
    });

    console.log("✅ Password reset successful for user:", user._id);

    return res.status(200).json({
      message: "Account password has been set successfully. You can now sign in.",
      success: true,
    });

  } catch (error: any) {
    console.error("❌ Password reset error:", error);
    
    return res.status(500).json({
      message: "Internal server error during password reset",
      error: process.env.NODE_ENV === 'development' ? error.message : "Unknown error occurred",
      success: false,
    });
  }
}