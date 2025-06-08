import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../utils/db";
import User from "../../models/User";

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

    let { firstName, lastName, email, password, country, educationalLevel } = req.body;

    let role: 'user' | 'mentor' = 'user';
    if (email?.toLowerCase().startsWith('mentor')) {
      role = 'mentor';
      email = email.replace(/^mentor/i, '');
    }

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
        details: {
          email: !!email,
          password: !!password,
        },
      });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(400).json({
        message: "User already exists with this email.",
        code: "USER_EXISTS",
      });
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      country,
      educationalLevel,
      role,
    });

    return res.status(201).json({
      message: "User created successfully",
      userId: newUser._id,
      success: true,
    });
  } catch (err: any) {
    console.error("Registration Error:", err);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: Object.values(err.errors).map((e: any) => e.message),
        success: false,
      });
    }

    if (err.code === 11000) {
      return res.status(400).json({
        message: "A user with this email already exists",
        code: "DUPLICATE_KEY",
        success: false,
      });
    }

    return res.status(500).json({
      message: "Internal server error during registration",
      error: err.message || "Unknown error occurred",
      success: false,
    });
  }
}