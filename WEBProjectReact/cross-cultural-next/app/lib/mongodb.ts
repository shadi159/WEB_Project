import mongoose from "mongoose";

// Declare the connection URI with a more robust type check
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

// Interface to type our cached connection
interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the global object to maintain connection across hot reloads
declare global {
  var mongoose: MongooseCache;
}

// Initialize cached connection
let cached = global.mongoose || { conn: null, promise: null };

async function connectToDatabase() {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Prevent multiple connection attempts
  if (!cached.promise) {
    const opts = {
      // Removed deprecated options
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    };

    try {
      cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
        console.log("MongoDB connected successfully");
        return mongoose;
      });
    } catch (error) {
      console.error("Initial MongoDB connection error:", error);
      throw error;
    }
  }

  try {
    // Wait for the connection promise
    await cached.promise;
    cached.conn = mongoose.connection;
    return cached.conn;
  } catch (e) {
    console.error("Detailed MongoDB Connection Error:", {
      message: e instanceof Error ? e.message : "Unknown error",
      stack: e instanceof Error ? e.stack : "No stack trace",
      name: e instanceof Error ? e.name : "Unknown error type"
    });
    
    // Reset the promise to allow retry
    cached.promise = null;
    throw e;
  }
}

// Add a cleanup function for graceful shutdown
function disconnectFromDatabase() {
  if (cached.conn) {
    mongoose.disconnect()
      .then(() => console.log("MongoDB disconnected"))
      .catch(err => console.error("Error disconnecting from MongoDB:", err));
  }
}

// Handle process termination
process.on('SIGINT', () => {
  disconnectFromDatabase();
  process.exit();
});

export default connectToDatabase;