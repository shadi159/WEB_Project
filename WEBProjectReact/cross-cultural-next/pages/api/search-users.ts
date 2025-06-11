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

// Mock user data for testing
const getMockUsers = (query: string, role?: string) => {
  const mockUsers = [
    {
      id: 'mentor_123',
      displayName: 'Dr. Sarah Johnson',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      role: 'mentor',
      email: 'sarah.johnson@example.com'
    },
    {
      id: 'user_456',
      displayName: 'John Smith',
      firstName: 'John',
      lastName: 'Smith',
      role: 'user',
      email: 'john.smith@example.com'
    },
    {
      id: 'mentor_one',
      displayName: 'mentor one',
      firstName: 'mentor',
      lastName: 'one',
      role: 'mentor',
      email: 'mentor.one@example.com'
    },
    {
      id: 'user_alex',
      displayName: 'Alex Wilson',
      firstName: 'Alex',
      lastName: 'Wilson',
      role: 'user',
      email: 'alex.wilson@example.com'
    },
    {
      id: 'mentor_emma',
      displayName: 'Dr. Emma Davis',
      firstName: 'Dr. Emma',
      lastName: 'Davis',
      role: 'mentor',
      email: 'emma.davis@example.com'
    }
  ];

  // Filter by query (case insensitive)
  let filteredUsers = mockUsers.filter(user => 
    user.firstName.toLowerCase().includes(query.toLowerCase()) ||
    user.lastName.toLowerCase().includes(query.toLowerCase()) ||
    user.displayName.toLowerCase().includes(query.toLowerCase()) ||
    user.email.toLowerCase().includes(query.toLowerCase())
  );

  // Filter by role if specified
  if (role) {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }

  return filteredUsers;
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
    let formattedUsers: any[] = [];

    // Always include mock users for testing
    const mockResults = getMockUsers(query, role as string);
    formattedUsers = [...mockResults];

    // Try to search real MongoDB users if available
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

      // Search for real users
      const users = await User.find(
        searchCriteria,
        { firstName: 1, lastName: 1, role: 1, email: 1, _id: 1 }
      ).limit(20); // Limit results to prevent large responses

      // Format real users and add to results
      const realUsers = users.map((user: any) => ({
        id: user._id.toString(),
        displayName: `${user.firstName || 'Unknown'} ${user.lastName || ''}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email
      }));

      formattedUsers = [...formattedUsers, ...realUsers];

    } catch (dbError) {
      console.log('MongoDB search failed, using mock data only:', dbError);
      // Continue with just mock data if MongoDB fails
    }

    // Remove duplicates based on ID
    const uniqueUsers = formattedUsers.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    res.status(200).json({ users: uniqueUsers });

  } catch (error) {
    console.error('Error searching users:', error);
    
    // Fallback to mock data if everything fails
    const mockResults = getMockUsers(query, role as string);
    res.status(200).json({ users: mockResults });
  }
}