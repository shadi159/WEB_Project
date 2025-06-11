// pages/api/test-mongo.ts - API endpoint to test MongoDB connection
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import LiveUser from '../../models/LiveUser';
import ActiveSession from '../../models/ActiveSession';

interface ConnectResult {
  success: boolean;
  message?: string;
  error?: string;
}

const connectMongo = async (): Promise<ConnectResult> => {
  if (mongoose.connections[0].readyState) {
    return { success: true, message: 'Already connected' };
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    return { success: true, message: 'Connected successfully' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Test MongoDB connection
    const connectionResult = await connectMongo();
    if (!connectionResult.success) {
      return res.status(500).json({
        success: false,
        error: `MongoDB connection failed: ${connectionResult.error}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test database operations
    const testResults = {
      connection: connectionResult,
      operations: {} as any
    };

    try {
      // Test LiveUser model
      const liveUserCount = await LiveUser.countDocuments();
      const liveUsers = await LiveUser.find().limit(5);
      testResults.operations.liveUsers = {
        count: liveUserCount,
        sample: liveUsers,
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      testResults.operations.liveUsers = {
        success: false,
        error: errorMessage
      };
    }

    try {
      // Test ActiveSession model
      const sessionCount = await ActiveSession.countDocuments();
      const sessions = await ActiveSession.find().limit(5);
      testResults.operations.activeSessions = {
        count: sessionCount,
        sample: sessions,
        success: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      testResults.operations.activeSessions = {
        success: false,
        error: errorMessage
      };
    }

    try {
      // Test write operation
      const testWrite = await LiveUser.create({
        userId: `test_${Date.now()}`,
        socketIoId: `test_socket_${Date.now()}`,
        role: 'user',
        status: 'offline'
      });
      
      // Clean up test data
      await LiveUser.deleteOne({ _id: testWrite._id });
      
      testResults.operations.writeTest = {
        success: true,
        message: 'Write and delete operations successful'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      testResults.operations.writeTest = {
        success: false,
        error: errorMessage
      };
    }

    // Database info
    const dbState = mongoose.connections[0].readyState;
    const dbStates: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        state: dbStates[dbState] || 'unknown',
        name: mongoose.connections[0].name,
        host: mongoose.connections[0].host,
        port: mongoose.connections[0].port
      },
      tests: testResults,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        mongoUriSet: !!process.env.MONGODB_URI,
        mongoUriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'Not set'
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('MongoDB test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}