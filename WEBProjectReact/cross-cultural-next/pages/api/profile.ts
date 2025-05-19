// pages/api/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../utils/db';
import User from '../../models/User';

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  // 3) Handle GET / PUT
  if (req.method === 'GET') {
    const dbUser = await User.findById(userId).select('-password');
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: dbUser });
  }

  if (req.method === 'PUT') {
  const { password, ...safeUpdates } = req.body;

  try {
    const dbUser = await User.findByIdAndUpdate(
      userId,
      { $set: safeUpdates }, // Explicit $set operator
      { 
        new: true,
        runValidators: true,
        context: 'query'
      }
    ).select('-password');
    
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: dbUser });
  } catch (err: any) {
    console.error('Update error:', err);
    return res.status(400).json({ message: err.message });
  }
}

  // 4) Method not allowed
  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
