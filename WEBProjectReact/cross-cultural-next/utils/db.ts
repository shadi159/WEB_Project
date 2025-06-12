// utils/db.ts - Simple but robust version with proper TypeScript
import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://globaledu:global123@firstdb.yxqjcce.mongodb.net/?retryWrites=true&w=majority&appName=firstdb";

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

export const connectToDatabase = async (): Promise<void> => {
  // If already connected, return immediately
  if (isConnected && mongoose.connections[0].readyState === 1) {
    console.log("🔄 Using existing MongoDB connection");
    return;
  }

  // If a connection is already in progress, wait for it
  if (connectionPromise) {
    console.log("⏳ Waiting for existing connection attempt...");
    return connectionPromise;
  }

  if (!MONGODB_URI) {
    throw new Error("Missing MongoDB URI in environment variables");
  }

  console.log("🔌 Initiating new MongoDB connection...");

  // Create the connection promise
  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      // Simple but effective connection options
      const options: mongoose.ConnectOptions = {
        // Timeouts
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        
        // Connection pool
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        
        // Reliability
        retryWrites: true,
        heartbeatFrequencyMS: 10000,
        
        // Write concern
        w: 'majority',
        wtimeoutMS: 10000,
        
        // Disable buffering for immediate error feedback
        bufferCommands: false,
      };

      // Set up event listeners before connecting
      mongoose.connection.on('connected', () => {
        console.log('✅ Mongoose connected to MongoDB Atlas');
        isConnected = true;
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ Mongoose connection error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ Mongoose disconnected from MongoDB Atlas');
        isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 Mongoose reconnected to MongoDB Atlas');
        isConnected = true;
      });

      // Connect to MongoDB
      await mongoose.connect(MONGODB_URI, options);
      
      // Verify connection
      const state = mongoose.connections[0].readyState;
      isConnected = state === 1;

      if (isConnected) {
        console.log("✅ Successfully connected to MongoDB Atlas");
        console.log(`🔗 Connection state: ${getConnectionState(state)}`);
        resolve();
      } else {
        throw new Error(`Connection failed. State: ${getConnectionState(state)}`);
      }

    } catch (error: any) {
      console.error("❌ MongoDB connection error:", error);
      isConnected = false;
      
      // Provide specific error messages
      let errorMessage = "Database connection failed";
      
      if (error.message.includes('ENOTFOUND')) {
        errorMessage = "DNS resolution failed - check your internet connection";
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = "Connection refused - MongoDB server may be down";
      } else if (error.message.includes('authentication failed')) {
        errorMessage = "Authentication failed - check your database credentials";
      } else if (error.message.includes('SSL') || error.message.includes('TLS')) {
        errorMessage = "SSL/TLS connection failed - network security issue";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Connection timeout - network may be slow or unstable";
      }
      
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).cause = error;
      reject(enhancedError);
    }
  });

  // Execute the connection and clean up the promise when done
  try {
    await connectionPromise;
  } finally {
    connectionPromise = null;
  }
};

// Helper function to get human-readable connection state
function getConnectionState(state: number): string {
  const states: { [key: number]: string } = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[state] || 'unknown';
}

// Utility function to check connection health
export const checkConnectionHealth = (): {
  isConnected: boolean;
  state: string;
  host?: string;
  database?: string;
} => {
  const connection = mongoose.connections[0];
  return {
    isConnected,
    state: getConnectionState(connection.readyState),
    host: connection.host,
    database: connection.name
  };
};

// Graceful shutdown function
export const disconnectFromDatabase = async (): Promise<void> => {
  if (isConnected) {
    console.log("🔌 Closing MongoDB connection...");
    await mongoose.disconnect();
    isConnected = false;
    console.log("✅ MongoDB connection closed");
  }
};

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await disconnectFromDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectFromDatabase();
    process.exit(0);
  });
}