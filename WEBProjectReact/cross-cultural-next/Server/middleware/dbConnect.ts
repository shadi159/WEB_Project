import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";

const MONGODB_URI="mongodb+srv://globaledu:global123@firstdb.yxqjcce.mongodb.net/?retryWrites=true&w=majority&appName=firstdb";

let isConnected = false;

const connectToDatabase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (isConnected) {
    next(); // Pass control to the next middleware
    return;
  }

  if (!MONGODB_URI) {
    res.status(500).json({ message: "Missing MongoDB URI" });
    return;
  }

 // try {
    const options = {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 60000,
      family: 4,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
    };

    await mongoose.connect(MONGODB_URI, options).then(() => {
      console.log("✅ Connected to MongoDB");}).catch((error) => {
      console.error("❌ DB connection error:", error); });
    /*isConnected = mongoose.connections[0].readyState === 1;

    if (isConnected) {
      console.log("✅ Connected to MongoDB");
      next(); // Pass control to the next middleware
    } else {
      res.status(500).json({ message: "Failed to connect to database" });
    }
  } catch (error) {
    console.error("❌ DB connection error:", error);
    res.status(503).json({ message: "Database connection failed", error });
  } */
};

export default connectToDatabase;