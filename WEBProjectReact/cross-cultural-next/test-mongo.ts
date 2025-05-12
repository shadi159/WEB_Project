import 'dotenv/config';  // Use ES module import for .env
import mongoose from 'mongoose';

async function connectToMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ Connected to MongoDB Atlas!");
    
    // If you want to disconnect after connecting, you can do:
    // await mongoose.disconnect();
  } catch (error: unknown) {
    console.error("❌ Connection error:", error instanceof Error ? error.message : 'Unknown error');
  }
}

// Call the function if you want to connect immediately
// connectToMongoDB();

export default connectToMongoDB;