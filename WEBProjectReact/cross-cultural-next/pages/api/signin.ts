// pages/api/signin.ts
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "../../utils/db";
import User from "../../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// 🔧 Define the user type for lean queries
interface UserDocument {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  country?: string;
  destination?: string;
  phone?: string;
  educationalLevel?: string;
  fieldOfStudy?: string;
  bio?: string;
  preferences?: {
    emailNotifications: boolean;
    appNotifications: boolean;
    resourceRecommendations: boolean;
    peerConnections: boolean;
  };
}

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

    // 🔧 FIXED: Proper typing with lean query
    console.log("🔍 Searching for user with email:", email);
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).lean() as UserDocument | null;

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
    console.log("🔐 Password starts with:", user.password ? user.password.substring(0, 7) : "NO PASSWORD");

    // Check if password exists
    if (!user.password) {
      console.log("❌ User has no password set");
      return res.status(401).json({
        message: "Account setup incomplete. Please contact support.",
        code: "NO_PASSWORD_SET",
        success: false,
      });
    }

    // 🔧 FIXED: Use bcrypt.compare directly with the stored hash
    console.log("🔐 Comparing passwords...");
    console.log("🔐 Input password length:", password.length);
    console.log("🔐 Stored hash length:", user.password.length);
    
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 Password comparison result:", isMatch ? "✅ MATCH" : "❌ NO MATCH");

    if (!isMatch) {
      console.log("❌ Password mismatch");
      return res.status(401).json({
        message: "Invalid credentials",
        success: false,
      });
    }

    console.log("✅ Password verified");

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
    return res.status(500).json({
      message: "Internal server error during sign in",
      error: process.env.NODE_ENV === 'development' ? error.message : "Unknown error occurred",
      success: false,
    });
  }
}