// pages/api/debug-user.ts - Debug API to check user state
import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../utils/db';
import User from '../../models/User';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'Debug API only available in development' });
  }

  try {
    await connectToDatabase();

    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email parameter required' });
    }

    console.log(`🔍 Debug: Looking up user: ${email}`);

    // Get user with ALL fields including password
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert to plain object for easier access
    const userObj = user.toObject() as any;

    // Create debug info with proper structure
    const debugInfo = {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      
      // Password field analysis
      passwordField: {
        exists: !!user.password,
        type: typeof user.password,
        length: user.password ? user.password.length : 0,
        isHashed: user.password ? (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) : false,
        preview: user.password ? user.password.substring(0, 10) + '...' : 'NO PASSWORD',
      },
      
      // Field analysis
      allFields: Object.keys(userObj),
      missingFields: [] as string[],
      
      // Document info
      mongoDocument: {
        isModified: user.isModified(),
        isNew: user.isNew,
        errors: user.errors || null
      }
    };

    // Check for missing expected fields
    if (!userObj.firstName) debugInfo.missingFields.push('firstName');
    if (!userObj.lastName) debugInfo.missingFields.push('lastName');
    if (!userObj.email) debugInfo.missingFields.push('email');
    if (!userObj.password) debugInfo.missingFields.push('password');
    if (!userObj.role) debugInfo.missingFields.push('role');

    console.log(`🔍 Debug info for ${email}:`, debugInfo);

    return res.status(200).json({
      message: 'User debug information',
      debug: debugInfo
    });

  } catch (error: any) {
    console.error('❌ Debug API error:', error);
    return res.status(500).json({
      message: 'Debug API error',
      error: error.message
    });
  }
}