import mongoose from "mongoose";
import dns from "dns";

// MongoDB connection string 
const MONGODB_URI = process.env.MONGODB_URI;

// Track the connection status
let isConnected = false;

/**
 * Performs DNS lookup to verify connectivity to MongoDB Atlas
 */
const checkDnsConnectivity = async (hostname: string) => {
  return new Promise((resolve) => {
    console.log(`Performing DNS lookup for: ${hostname}`);
    dns.lookup(hostname, (err, address) => {
      if (err) {
        console.error('DNS lookup failed:', err);
        resolve(false);
      } else {
        console.log(`DNS resolved to IP: ${address}`);
        resolve(true);
      }
    });
  });
};

/**
 * Connects to MongoDB database with enhanced diagnostics
 */
const connectToDatabase = async () => {
  if (isConnected) {
    console.log("=> Using existing MongoDB connection");
    return;
  }

  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable in .env.local"
    );
  }

  try {
    console.log("=> Starting MongoDB connection process...");
    console.log(`MongoDB URI defined: ${MONGODB_URI ? "Yes" : "No"}`);
    
    // Extract hostname from connection string for DNS check
    const hostnameMatch = MONGODB_URI.match(/mongodb\+srv:\/\/[^@]+@([^\/\?]+)/);
    const hostname = hostnameMatch ? hostnameMatch[1] : null;
    
    if (hostname) {
      const dnsResolved = await checkDnsConnectivity(hostname);
      if (!dnsResolved) {
        console.error(`⚠️ Warning: Could not resolve DNS for ${hostname}`);
        console.log("Attempting connection anyway...");
      }
    }
    
    // Detailed connection options
    const options = {
      serverSelectionTimeoutMS: 20000, // Increase timeout to 20 seconds
      socketTimeoutMS: 60000, // Increase socket timeout
      family: 4, // Use IPv4
      connectTimeoutMS: 30000, // Connection timeout
      heartbeatFrequencyMS: 10000 // How often to check server health
    };
    
    console.log("Connecting with options:", JSON.stringify(options));
    
    // Attempt connection
    await mongoose.connect(MONGODB_URI, options);
    
    isConnected = mongoose.connections[0].readyState === 1;
    
    if (isConnected) {
      console.log("✅ MongoDB connected successfully!");
      console.log(`Connection state: ${mongoose.connections[0].readyState}`);
      console.log(`Connected to database: ${mongoose.connections[0].name}`);
    } else {
      console.error("❌ Connection state is not active despite no errors thrown");
    }
    
  } catch (error) {
    console.error("MongoDB connection error:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
    } else {
      console.error("An unknown error occurred:", error);
    }
    
    if (error instanceof Error && error.name === 'MongoServerSelectionError') {
      console.error("⚠️ Server selection error - possible causes:");
      console.error("   - IP not whitelisted in MongoDB Atlas");
      console.error("   - Network connectivity issues");
      console.error("   - Incorrect credentials");
      console.error("   - Cluster is paused or being maintained");
    }
    
    if (error instanceof Error) {
      throw new Error(`Failed to connect to MongoDB: ${error.message}`);
    } else {
      throw new Error("Failed to connect to MongoDB: An unknown error occurred");
    }
  }
};

export default connectToDatabase;