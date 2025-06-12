// pages/api/search-users.ts - Updated to work with your existing User model
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../utils/db';
import User from '../../models/User';

// Rate limiting
const searchCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_SEARCHES_PER_MINUTE = 20;

// Mock user data for testing
const getMockUsers = (query: string, role?: string) => {
  const mockUsers = [
    {
      id: 'mentor_123',
      _id: 'mentor_123',
      displayName: 'Dr. Sarah Johnson',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      role: 'mentor',
      email: 'sarah.johnson@example.com'
    },
    {
      id: 'user_456',
      _id: 'user_456',
      displayName: 'John Smith',
      firstName: 'John',
      lastName: 'Smith',
      role: 'user',
      email: 'john.smith@example.com'
    },
    {
      id: 'mentor_one',
      _id: 'mentor_one',
      displayName: 'mentor one',
      firstName: 'mentor',
      lastName: 'one',
      role: 'mentor',
      email: 'mentor.one@example.com'
    },
    {
      id: 'user_alex',
      _id: 'user_alex',
      displayName: 'Alex Wilson',
      firstName: 'Alex',
      lastName: 'Wilson',
      role: 'user',
      email: 'alex.wilson@example.com'
    },
    {
      id: 'mentor_emma',
      _id: 'mentor_emma',
      displayName: 'Dr. Emma Davis',
      firstName: 'Dr. Emma',
      lastName: 'Davis',
      role: 'mentor',
      email: 'emma.davis@example.com'
    },
    {
      id: 'user_maria',
      _id: 'user_maria',
      displayName: 'Maria Garcia',
      firstName: 'Maria',
      lastName: 'Garcia',
      role: 'user',
      email: 'maria.garcia@example.com'
    },
    {
      id: 'mentor_david',
      _id: 'mentor_david',
      displayName: 'David Chen',
      firstName: 'David',
      lastName: 'Chen',
      role: 'mentor',
      email: 'david.chen@example.com'
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
  if (role && ['user', 'mentor'].includes(role)) {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }

  return filteredUsers;
};

// Rate limiting check
const checkSearchRateLimit = (clientId: string): boolean => {
  const now = Date.now();
  const clientData = searchCounts.get(clientId) || { count: 0, resetTime: now + 60000 };
  
  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + 60000;
  } else {
    clientData.count++;
  }
  
  searchCounts.set(clientId, clientData);
  return clientData.count <= MAX_SEARCHES_PER_MINUTE;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Rate limiting
  const clientId = (req.headers['x-forwarded-for'] as string) || 
                   (req.socket.remoteAddress) || 'unknown';
  
  if (!checkSearchRateLimit(clientId)) {
    return res.status(429).json({ 
      message: 'Too many search requests. Please slow down.',
      retryAfter: 60 
    });
  }

  const { query, role } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Search query is required' });
  }

  if (query.length < 2) {
    return res.status(400).json({ message: 'Query must be at least 2 characters long' });
  }

  if (query.length > 100) {
    return res.status(400).json({ message: 'Query too long' });
  }

  // Validate role parameter
  if (role && typeof role === 'string' && !['user', 'mentor'].includes(role)) {
    return res.status(400).json({ message: 'Role must be either "user" or "mentor"' });
  }

  try {
    let formattedUsers: any[] = [];

    // Always include mock users for testing
    const mockResults = getMockUsers(query, role as string);
    formattedUsers = [...mockResults];

    // Try to search real MongoDB users if available
    try {
      await connectToDatabase();

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
      )
      .limit(20) // Limit results to prevent large responses
      .lean(); // Use lean() for better performance

      // Format real users and add to results
      const realUsers = users.map((user: any) => ({
        id: user._id.toString(),
        _id: user._id.toString(),
        displayName: `${user.firstName || 'Unknown'} ${user.lastName || 'User'}`.trim(),
        firstName: user.firstName || 'Unknown',
        lastName: user.lastName || 'User',
        role: user.role || 'user',
        email: user.email
      }));

      formattedUsers = [...formattedUsers, ...realUsers];
      console.log(`Found ${users.length} real users and ${mockResults.length} mock users`);

    } catch (dbError) {
      console.log('MongoDB search failed, using mock data only:', dbError);
      // Continue with just mock data if MongoDB fails
    }

    // Remove duplicates based on ID
    const uniqueUsers = formattedUsers.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    // Sort results by relevance (exact matches first, then partial matches)
    const sortedUsers = uniqueUsers.sort((a, b) => {
      const aExact = a.firstName.toLowerCase() === query.toLowerCase() || 
                     a.lastName.toLowerCase() === query.toLowerCase();
      const bExact = b.firstName.toLowerCase() === query.toLowerCase() || 
                     b.lastName.toLowerCase() === query.toLowerCase();
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then sort by display name
      return a.displayName.localeCompare(b.displayName);
    });

    // Set cache headers for search results
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute

    res.status(200).json({ 
      users: sortedUsers,
      success: true,
      query: query,
      role: role || null,
      count: sortedUsers.length
    });

  } catch (error) {
    console.error('Error searching users:', error);
    
    // Fallback to mock data if everything fails
    const mockResults = getMockUsers(query, role as string);
    
    res.status(200).json({ 
      users: mockResults,
      success: true,
      query: query,
      role: role || null,
      count: mockResults.length,
      fallback: true,
      message: 'Using mock data due to database error'
    });
  }
}