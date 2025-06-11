// pages/api/test-auth.ts - Debug endpoint to test your authentication setup
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

interface TestResults {
  timestamp: string;
  environment: {
    nodeEnv?: string;
    mongoUriExists: boolean;
    jwtSecretExists: boolean;
    mongoUriPrefix: string;
  };
  tests: {
    mongoConnection?: {
      success: boolean;
      message?: string;
      error?: string;
    };
    userOperations?: {
      success: boolean;
      userCount?: number;
      sampleUsers?: Array<{
        id: string;
        email?: string;
        name: string;
        role?: string;
      }>;
      error?: string;
    };
    passwordHashing?: {
      success: boolean;
      hashWorks?: boolean;
      compareWorks?: boolean;
      error?: string;
    };
    userLookup?: {
      success: boolean;
      userExists?: boolean;
      userData?: {
        id: string;
        email?: string;
        name: string;
        role?: string;
        hasPassword: boolean;
      } | null;
      error?: string;
    };
    jwtOperations?: {
      success: boolean;
      canCreateToken?: boolean;
      canVerifyToken?: boolean;
      error?: string;
    };
  };
  error?: string;
}

const connectMongo = async () => {
  if (mongoose.connections[0].readyState) {
    return { success: true, message: "Already connected" };
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    return { success: true, message: "Connected successfully" };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  role: String,
  country: String,
  educationalLevel: String,
  preferences: Object
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const testResults: TestResults = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      mongoUriExists: !!process.env.MONGODB_URI,
      jwtSecretExists: !!process.env.JWT_SECRET,
      mongoUriPrefix: process.env.MONGODB_URI ? 
        process.env.MONGODB_URI.substring(0, 20) + '...' : 'Not set'
    },
    tests: {}
  };

  try {
    // Test 1: MongoDB Connection
    console.log("Testing MongoDB connection...");
    const connectionResult = await connectMongo();
    testResults.tests.mongoConnection = connectionResult;

    if (connectionResult.success) {
      // Test 2: User Model Operations
      try {
        const userCount = await User.countDocuments();
        const sampleUsers = await User.find({}, { email: 1, firstName: 1, lastName: 1, role: 1 }).limit(3);
        
        testResults.tests.userOperations = {
          success: true,
          userCount,
          sampleUsers: sampleUsers.map((user: any) => ({
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            role: user.role
          }))
        };
      } catch (error) {
        testResults.tests.userOperations = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }

      // Test 3: Password Hashing
      try {
        const testPassword = "testPassword123";
        const hashedPassword = await bcrypt.hash(testPassword, 12);
        const isMatch = await bcrypt.compare(testPassword, hashedPassword);
        
        testResults.tests.passwordHashing = {
          success: true,
          hashWorks: !!hashedPassword,
          compareWorks: isMatch
        };
      } catch (error) {
        testResults.tests.passwordHashing = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }

      // Test 4: Find specific user (if email provided)
      if (req.method === 'POST' && req.body.email) {
        try {
          const testUser = await User.findOne({ email: req.body.email });
          testResults.tests.userLookup = {
            success: true,
            userExists: !!testUser,
            userData: testUser ? {
              id: testUser._id.toString(),
              email: testUser.email,
              name: `${testUser.firstName || ''} ${testUser.lastName || ''}`.trim(),
              role: testUser.role,
              hasPassword: !!testUser.password
            } : null
          };
        } catch (error) {
          testResults.tests.userLookup = {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
    }

    // Test 5: JWT Configuration
    try {
      const jwt = require('jsonwebtoken');
      const testPayload = { userId: 'test123', email: 'test@example.com' };
      const token = jwt.sign(testPayload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      testResults.tests.jwtOperations = {
        success: true,
        canCreateToken: !!token,
        canVerifyToken: !!decoded
      };
    } catch (error) {
      testResults.tests.jwtOperations = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }

    res.status(200).json(testResults);

  } catch (error) {
    console.error('Test API Error:', error);
    res.status(500).json({
      ...testResults,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
}

// Usage instructions
export const config = {
  api: {
    externalResolver: true,
  },
};

/*
USAGE:
1. GET /api/test-auth - Run basic tests
2. POST /api/test-auth with { "email": "user@example.com" } - Test specific user lookup

This will help you identify exactly what's failing in your authentication setup.
*/