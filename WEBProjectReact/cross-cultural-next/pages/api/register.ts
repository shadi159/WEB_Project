import type { NextApiRequest, NextApiResponse } from "next";
import connectToDatabase from "../../app/lib/mongodb";
import User from "../../models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure only POST requests are handled
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Attempt to connect to the database
    await connectToDatabase();

    // Destructure request body
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      country, 
      educationalLevel 
    } = req.body;

    // Validate essential fields
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required.",
        details: {
          email: !!email,
          password: !!password
        }
      });
    }

    // Check for existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ 
        message: "User already exists with this email.",
        code: "USER_EXISTS"
      });
    }

    // Create new user
    const newUser = await User.create({
      firstName, 
      lastName, 
      email, 
      password, 
      country, 
      educationalLevel
    });

    // Respond with success
    return res.status(201).json({ 
      message: "User created successfully",
      userId: newUser._id
    });

  } catch (err: any) {
    // Comprehensive error logging and handling
    console.error("Registration Error:", {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack
    });

    // Handle specific mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: "Validation failed",
        errors: Object.values(err.errors).map((e: any) => e.message)
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A user with this email already exists",
        code: "DUPLICATE_KEY"
      });
    }

    // Generic server error
    return res.status(500).json({ 
      message: "Internal server error during registration",
      error: err.message || "Unknown error occurred"
    });
  }
}