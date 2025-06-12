// pages/api/get-user-details.ts - Optimized API with better caching and rate limiting
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

// User model (adjust this to match your actual User model)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  role: String,
  email: String,
  // Add other fields as needed
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const connectMongo = async () => {
  if (mongoose.connections[0].readyState) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Helper function to check if a string is a valid ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
};

// In-memory cache to prevent repeated database queries
const userCache = new Map<string, any>();
const cacheExpiry = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS_PER_MINUTE = 30;

// Mock user data for test users
const getMockUserData = (userId: string) => {
  const mockUsers: { [key: string]: any } = {
    'mentor_123': {
      displayName: 'Dr. Sarah Johnson',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      role: 'mentor',
      id: 'mentor_123'
    },
    'user_456': {
      displayName: 'John Smith',
      firstName: 'John',
      lastName: 'Smith',
      role: 'user',
      id: 'user_456'
    },
    'mentor_one': {
      displayName: 'mentor one',
      firstName: 'mentor',
      lastName: 'one',
      role: 'mentor',
      id: 'mentor_one'
    }
  };

  // Check for dynamically generated test users
  if (userId.startsWith('user_') && !mockUsers[userId]) {
    return {
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      id: userId
    };
  }

  if (userId.startsWith('mentor_') && !mockUsers[userId]) {
    return {
      displayName: 'Test Mentor',
      firstName: 'Test',
      lastName: 'Mentor',
      role: 'mentor',
      id: userId
    };
  }

  return mockUsers[userId] || null;
};

// Rate limiting check
const checkRateLimit = (clientId: string): boolean => {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  const clientData = requestCounts.get(clientId) || { count: 0, resetTime: now + 60000 };
  
  if (now > clientData.resetTime) {
    // Reset the counter
    clientData.count = 1;
    clientData.resetTime = now + 60000;
  } else {
    clientData.count++;
  }
  
  requestCounts.set(clientId, clientData);
  
  return clientData.count <= MAX_REQUESTS_PER_MINUTE;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get client identifier for rate limiting
  const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  // Check rate limit
  if (!checkRateLimit(clientId as string)) {
    return res.status(429).json({ 
      message: 'Too many requests. Please slow down.',
      retryAfter: 60 
    });
  }

  const { userIds } = req.query;

  if (!userIds) {
    return res.status(400).json({ message: 'userIds parameter is required' });
  }

  try {
    // Handle single ID or array of IDs
    const idsArray = Array.isArray(userIds) ? userIds : [userIds];
    
    if (idsArray.length > 50) {
      return res.status(400).json({ message: 'Maximum 50 user IDs allowed per request' });
    }
    
    console.log(`Fetching user details for ${idsArray.length} users`);
    
    // Separate valid ObjectIds from test user IDs
    const validObjectIds: string[] = [];
    const testUserIds: string[] = [];
    const cachedUserIds: string[] = [];
    
    idsArray.forEach(id => {
      // Check cache first
      const now = Date.now();
      const expiry = cacheExpiry.get(id);
      
      if (userCache.has(id) && expiry && now < expiry) {
        cachedUserIds.push(id);
      } else if (isValidObjectId(id)) {
        validObjectIds.push(id);
      } else {
        testUserIds.push(id);
      }
    });

    const userMap: { [key: string]: any } = {};

    // Add cached users
    cachedUserIds.forEach(id => {
      userMap[id] = userCache.get(id);
    });

    // Fetch real users from MongoDB if we have valid ObjectIds
    if (validObjectIds.length > 0) {
      console.log(`Fetching ${validObjectIds.length} users from MongoDB`);
      
      try {
        await connectMongo();
        
        const users = await User.find(
          { _id: { $in: validObjectIds } },
          { firstName: 1, lastName: 1, role: 1, email: 1, _id: 1 }
        ).lean(); // Use lean() for better performance

        // Add real users to the map and cache
        const now = Date.now();
        users.forEach((user: any) => {
          const userData = {
            displayName: `${user.firstName || 'Unknown'} ${user.lastName || ''}`.trim(),
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            email: user.email,
            id: user._id.toString()
          };
          
          userMap[user._id.toString()] = userData;
          
          // Cache the result
          userCache.set(user._id.toString(), userData);
          cacheExpiry.set(user._id.toString(), now + CACHE_DURATION);
        });
        
        console.log(`Successfully fetched ${users.length} users from MongoDB`);
      } catch (dbError) {
        console.error('MongoDB fetch error:', dbError);
        // Continue with cached and mock data
      }
    }

    // Add mock data for test user IDs
    testUserIds.forEach(id => {
      const mockData = getMockUserData(id);
      if (mockData) {
        userMap[id] = mockData;
        
        // Cache mock data too
        const now = Date.now();
        userCache.set(id, mockData);
        cacheExpiry.set(id, now + CACHE_DURATION);
      }
    });

    // Clean up expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance
      const now = Date.now();
      for (const [key, expiry] of cacheExpiry.entries()) {
        if (now > expiry) {
          userCache.delete(key);
          cacheExpiry.delete(key);
        }
      }
    }

    console.log(`Returning ${Object.keys(userMap).length} user details`);
    
    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.status(200).json({ users: userMap });

  } catch (error) {
    console.error('Error fetching user details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      message: 'Failed to fetch user details',
      error: errorMessage 
    });
  }
}