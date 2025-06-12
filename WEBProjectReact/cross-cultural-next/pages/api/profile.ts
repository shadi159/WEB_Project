// pages/api/profile.ts - Fixed TypeScript errors
import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../utils/db';
import User from '../../models/User';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Type for the user document
interface UserDocument {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1) Authenticate
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized', error: 'No valid authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  let decoded: any;
  
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (jwtError) {
    console.error('JWT verification error:', jwtError);
    return res.status(401).json({ message: 'Invalid token', error: 'Token verification failed' });
  }
  
  const userId = decoded.userId || decoded.id;
  if (!userId) {
    return res.status(401).json({ message: 'Invalid token payload', error: 'No user ID in token' });
  }

  // 2) Ensure DB connection
  try {
    await connectToDatabase();
  } catch (err: any) {
    console.error('DB connection error:', err);
    return res.status(500).json({ message: 'Database connection failed', error: err.message });
  }

  // 3) Handle GET request
  if (req.method === 'GET') {
    try {
      const dbUser = await User.findById(userId).select('-password').lean() as UserDocument | null;
      
      if (!dbUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Format user data for mentor system compatibility
      const { _id, ...otherFields } = dbUser;
      const formattedUser = {
        id: _id.toString(),
        _id: _id.toString(),
        displayName: `${dbUser.firstName || 'Unknown'} ${dbUser.lastName || 'User'}`.trim(),
        firstName: dbUser.firstName || 'Unknown',
        lastName: dbUser.lastName || 'User',
        email: dbUser.email,
        role: dbUser.role || 'user', // Ensure role is always present
        ...otherFields // Include any other fields
      };

      return res.status(200).json({ 
        user: formattedUser,
        success: true 
      });
      
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ 
        message: 'Failed to fetch user profile',
        error: err.message 
      });
    }
  }

  // 4) Handle PUT request (profile updates)
  if (req.method === 'PUT') {
    try {
      const { password, _id: any, id, ...safeUpdates } = req.body;

      // Validate role if being updated
      if (safeUpdates.role && !['user', 'mentor'].includes(safeUpdates.role)) {
        return res.status(400).json({ 
          message: 'Invalid role',
          error: 'Role must be either "user" or "mentor"' 
        });
      }

      const dbUser = await User.findByIdAndUpdate(
        userId,
        { $set: safeUpdates },
        { 
          new: true,
          runValidators: true,
          context: 'query'
        }
      ).select('-password').lean() as UserDocument | null;
      
      if (!dbUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Format updated user data
      const { _id, ...otherFields } = dbUser;
      const formattedUser = {
        id: _id.toString(),
        _id: _id.toString(),
        displayName: `${dbUser.firstName || 'Unknown'} ${dbUser.lastName || 'User'}`.trim(),
        firstName: dbUser.firstName || 'Unknown',
        lastName: dbUser.lastName || 'User',
        email: dbUser.email,
        role: dbUser.role || 'user',
        ...otherFields
      };

      return res.status(200).json({ 
        user: formattedUser,
        success: true,
        message: 'Profile updated successfully'
      });
      
    } catch (err: any) {
      console.error('Profile update error:', err);
      return res.status(400).json({ 
        message: 'Failed to update profile',
        error: err.message 
      });
    }
  }

  // 5) Method not allowed
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ 
    message: `Method ${req.method} Not Allowed`,
    error: 'Only GET and PUT methods are supported'
  });
}