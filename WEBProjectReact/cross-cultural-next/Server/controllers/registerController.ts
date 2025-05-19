import { Request, Response } from "express";
import User from "../../models/User";

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, country, educationalLevel } = req.body;
    console.log("1")

    if (!email || !password) {
      res.status(400).json({
        message: "Email and password are required.",
        details: {
          email: !!email,
          password: !!password,
        },
      });
      return;
    }
        console.log("2")
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      res.status(400).json({
        message: "User already exists with this email.",
        code: "USER_EXISTS",
      });
      return;
    }
    console.log("3")
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      country,
      educationalLevel,
    });

    res.status(201).json({
      message: "User created successfully",
      userId: newUser._id,
      success: true,
    });
  } catch (err: any) {
    console.error("Registration Error:", err);

    if (err.name === "ValidationError") {
      res.status(400).json({
        message: "Validation failed",
        errors: Object.values(err.errors).map((e: any) => e.message),
        success: false,
      });
      return;
    }

    if (err.code === 11000) {
      res.status(400).json({
        message: "A user with this email already exists",
        code: "DUPLICATE_KEY",
        success: false,
      });
      return;
    }

    res.status(500).json({
      message: "Internal server error during registration",
      error: err.message || "Unknown error occurred",
      success: false,
    });
  }
};