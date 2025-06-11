// pages/api/search-users.ts - API to search users by name
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

  const { query, role } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    await connectMongo();

    // Build search criteria
    const searchCriteria: any = {
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };

    // Filter by role if specified
    if (role && typeof role === 'string') {
      searchCriteria.role = role;
    }

    // Search for users
    const users = await User.find(
      searchCriteria,
      { firstName: 1, lastName: 1, role: 1, email: 1, _id: 1 }
    ).limit(20); // Limit results to prevent large responses

    // Format results
    const formattedUsers = users.map((user: any) => ({
      id: user._id.toString(),
      displayName: `${user.firstName || 'Unknown'} ${user.lastName || ''}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      email: user.email
    }));

    res.status(200).json({ users: formattedUsers });

  } catch (error) {
    console.error('Error searching users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      message: 'Failed to search users',
      error: errorMessage 
    });
  }
}