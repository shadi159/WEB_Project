// pages/api/signin.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/db";
import User from "../../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Make sure to install jsonwebtoken: npm install jsonwebtoken
// Also install its types: npm install --save-dev @types/jsonwebtoken

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Use environment variable in production

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Connect to the database
    await connectToDatabase();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        success: false,
      });
    }

    // Find the user in the database
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        success: false,
      });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        success: false,
      });
    }

    // Create a JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    // Return user data and token (excluding password)
    const userData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      country: user.country,
      educationalLevel: user.educationalLevel,
      preferences: user.preferences || {
        emailNotifications: true,
        appNotifications: true,
        resourceRecommendations: true,
        peerConnections: true
      }
    };

    return res.status(200).json({
      message: "Sign in successful",
      user: userData,
      token,
      success: true,
    });
  } catch (error: any) {
    console.error("Sign In Error:", error);
    return res.status(500).json({
      message: "Internal server error during sign in",
      error: error.message || "Unknown error occurred",
      success: false,
    });
  }
}