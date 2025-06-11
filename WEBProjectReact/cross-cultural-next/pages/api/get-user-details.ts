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
    await connectMongo();

    // Handle single ID or array of IDs
    const idsArray = Array.isArray(userIds) ? userIds : [userIds];
    
    // Fetch user details for all requested IDs
    const users = await User.find(
      { _id: { $in: idsArray } },
      { firstName: 1, lastName: 1, role: 1, _id: 1 }
    );

    // Create a mapping of ID to user details
    const userMap = users.reduce((acc: any, user: any) => {
      acc[user._id.toString()] = {
        displayName: `${user.firstName || 'Unknown'} ${user.lastName || ''}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        id: user._id.toString()
      };
      return acc;
    }, {});

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