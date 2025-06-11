// pages/api/get-user-details.ts - API to fetch user details by ID
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userIds } = req.query;

  if (!userIds) {
    return res.status(400).json({ message: 'userIds parameter is required' });
  }

  try {
    // Handle single ID or array of IDs
    const idsArray = Array.isArray(userIds) ? userIds : [userIds];
    
    // Separate valid ObjectIds from test user IDs
    const validObjectIds: string[] = [];
    const testUserIds: string[] = [];
    
    idsArray.forEach(id => {
      if (isValidObjectId(id)) {
        validObjectIds.push(id);
      } else {
        testUserIds.push(id);
      }
    });

    const userMap: { [key: string]: any } = {};

    // Fetch real users from MongoDB if we have valid ObjectIds
    if (validObjectIds.length > 0) {
      await connectMongo();
      
      const users = await User.find(
        { _id: { $in: validObjectIds } },
        { firstName: 1, lastName: 1, role: 1, email: 1, _id: 1 }
      );

      // Add real users to the map
      users.forEach((user: any) => {
        userMap[user._id.toString()] = {
          displayName: `${user.firstName || 'Unknown'} ${user.lastName || ''}`.trim(),
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          email: user.email,
          id: user._id.toString()
        };
      });
    }

    // Add mock data for test user IDs
    testUserIds.forEach(id => {
      const mockData = getMockUserData(id);
      if (mockData) {
        userMap[id] = mockData;
      }
    });

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