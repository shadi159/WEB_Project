import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://globaledu:global123@firstdb.yxqjcce.mongodb.net/?retryWrites=true&w=majority&appName=firstdb";

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  if (!MONGODB_URI) {
    throw new Error("Missing MongoDB URI");
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 60000,
      family: 4,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
    };

    await mongoose.connect(MONGODB_URI, options);
    isConnected = mongoose.connections[0].readyState === 1;

    if (isConnected) {
      console.log("✅ Connected to MongoDB");
    } else {
      throw new Error("Failed to connect to database");
    }
  } catch (error) {
    console.error("❌ DB connection error:", error);
    throw new Error("Database connection failed");
  }
};