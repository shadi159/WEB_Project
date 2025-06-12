// pages/api/profile.ts - SAFE VERSION that never touches password field
import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../utils/db';
import User from '../../models/User';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`🔄 Profile API called: ${req.method}`);
  
  // 1) Authenticate
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
  const userId = decoded.userId;

  // 2) Ensure DB connection
  try {
    await connectToDatabase();
  } catch (err: any) {
    console.error('DB connection error:', err);
    return res.status(500).json({ message: 'Database connection failed' });
  }

  // 3) Handle GET
  if (req.method === 'GET') {
    try {
      console.log(`🔍 Fetching user profile for: ${userId}`);
      const dbUser = await User.findById(userId).select('-password');
      if (!dbUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      console.log(`✅ Profile fetched successfully for: ${dbUser.email}`);
      return res.status(200).json({ user: dbUser });
    } catch (err: any) {
      console.error('❌ Profile fetch error:', err);
      return res.status(500).json({ message: 'Failed to fetch profile' });
    }
  }

  // 4) Handle PUT (Profile Update)
  if (req.method === 'PUT') {
    try {
      console.log(`💾 Updating profile for user: ${userId}`);
      console.log(`📝 Update payload:`, req.body);

      // 🚨 CRITICAL: Explicitly exclude password and sensitive fields
      const { 
        password, 
        _id, 
        __v, 
        createdAt, 
        updatedAt,
        ...safeUpdates 
      } = req.body;

      // 🔒 Double-check: Remove any password-related fields that might sneak in
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(safeUpdates).filter(([key]) => 
          !key.toLowerCase().includes('password') && 
          !key.startsWith('_') &&
          key !== 'role' // Prevent role escalation
        )
      );

      console.log(`🧹 Sanitized updates:`, sanitizedUpdates);

      // 🔥 CRITICAL: Use $set with explicit field targeting to avoid overwriting
      const dbUser = await User.findByIdAndUpdate(
        userId,
        { 
          $set: sanitizedUpdates  // Only update the specific fields
        },
        { 
          new: true,
          runValidators: true,
          context: 'query'
        }
      ).select('-password'); // Always exclude password from response

      if (!dbUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log(`✅ Profile updated successfully for: ${dbUser.email}`);

      // 🔍 Debug: Check if user still has password in DB (without returning it)
      const userWithPassword = await User.findById(userId).select('+password');
      console.log(`🔐 Password still exists after update: ${!!userWithPassword?.password}`);
      console.log(`🔐 Password length after update: ${userWithPassword?.password?.length || 0}`);

      return res.status(200).json({ 
        user: dbUser,
        debug: {
          passwordStillExists: !!userWithPassword?.password,
          passwordLength: userWithPassword?.password?.length || 0
        }
      });
    } catch (err: any) {
      console.error('❌ Profile update error:', err);
      return res.status(400).json({ 
        message: err.message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }

  // 5) Method not allowed
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}