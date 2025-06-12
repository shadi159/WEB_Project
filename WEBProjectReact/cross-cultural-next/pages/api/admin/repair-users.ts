// pages/api/admin/repair-users.ts - Emergency repair script
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../utils/db';
import User from '../../../models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 🔒 Security: Only allow in development or with admin key
  const adminKey = req.headers['x-admin-key'];
  if (process.env.NODE_ENV === 'production' && adminKey !== process.env.ADMIN_KEY) {
    return res.status(403).json({ message: 'Forbidden - Admin access required' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log("🔧 Starting database repair...");
    await connectToDatabase();

    const { action, email, newPassword } = req.body;

    if (action === 'diagnose') {
      // 🔍 Diagnose all users
      console.log("🔍 Diagnosing all users...");
      
      const allUsers = await User.find({}, {
        email: 1,
        firstName: 1,
        lastName: 1,
        password: 1,
        createdAt: 1
      });

      const diagnosis = allUsers.map(user => ({
        _id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0,
        passwordType: typeof user.password,
        isHashedPassword: user.password ? user.password.startsWith('$2') : false,
        createdAt: user.createdAt,
        status: !user.password ? '❌ NO PASSWORD' : 
                user.password.length === 0 ? '❌ EMPTY PASSWORD' :
                user.password.startsWith('$2') ? '✅ HASHED PASSWORD' : '⚠️ PLAIN TEXT PASSWORD'
      }));

      const problemUsers = diagnosis.filter(u => !u.hasPassword || u.passwordLength === 0 || !u.isHashedPassword);
      
      return res.status(200).json({
        message: 'Diagnosis complete',
        totalUsers: allUsers.length,
        problemUsers: problemUsers.length,
        allUsers: diagnosis,
        problemUsersDetails: problemUsers
      });
    }

    if (action === 'repair-specific-user') {
      // 🔧 Repair specific user
      if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and newPassword required for repair' });
      }

      console.log(`🔧 Repairing user: ${email}`);
      
      // Find user with raw query to avoid any middleware
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log("📊 User before repair:");
      console.log("- Has password:", !!user.password);
      console.log("- Password length:", user.password ? user.password.length : 0);
      console.log("- Password type:", typeof user.password);

      // 🔧 Manually hash and set password (bypassing pre-save hooks)
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      // Update directly in database
      const updateResult = await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword } }
      );

      console.log("✅ Update result:", updateResult);

      // Verify the repair
      const repairedUser = await User.findById(user._id);
      console.log("📊 User after repair:");
      console.log("- Has password:", !!repairedUser?.password);
      console.log("- Password length:", repairedUser?.password ? repairedUser.password.length : 0);
      console.log("- Is hashed:", repairedUser?.password ? repairedUser.password.startsWith('$2') : false);

      return res.status(200).json({
        message: 'User repaired successfully',
        user: {
          _id: user._id,
          email: user.email,
          hasPassword: !!repairedUser?.password,
          passwordLength: repairedUser?.password ? repairedUser.password.length : 0,
          isHashed: repairedUser?.password ? repairedUser.password.startsWith('$2') : false
        },
        updateResult
      });
    }

    if (action === 'repair-all-broken') {
      // 🔧 Repair all users with missing/invalid passwords
      console.log("🔧 Finding all broken users...");
      
      const brokenUsers = await User.find({
        $or: [
          { password: { $exists: false } },
          { password: null },
          { password: "" },
          { password: { $regex: /^(?!\$2[ab]\$).*/ } } // Not hashed
        ]
      });

      console.log(`Found ${brokenUsers.length} broken users`);

      if (brokenUsers.length === 0) {
        return res.status(200).json({
          message: 'No broken users found',
          repairedUsers: []
        });
      }

      // This is dangerous - only for emergency situations
      const defaultPassword = newPassword || 'TempPassword123!';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      const repairedUsers = [];
      for (const user of brokenUsers) {
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        
        repairedUsers.push({
          _id: user._id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        });
      }

      return res.status(200).json({
        message: `Repaired ${repairedUsers.length} users`,
        defaultPassword: defaultPassword,
        repairedUsers
      });
    }

    return res.status(400).json({ message: 'Invalid action. Use: diagnose, repair-specific-user, or repair-all-broken' });

  } catch (error: any) {
    console.error('❌ Repair error:', error);
    res.status(500).json({ 
      message: 'Internal server error during repair',
      error: error.message
    });
  }
}

// 🔧 Alternative: Manual MongoDB shell commands
// If you want to fix this directly in MongoDB:
/*
// 1. Check the problematic user:
db.users.findOne({email: "m1@gmail.com"})

// 2. If password is missing/empty, delete and re-register:
db.users.deleteOne({email: "m1@gmail.com"})

// 3. Or set a temporary hashed password:
db.users.updateOne(
  {email: "m1@gmail.com"}, 
  {$set: {password: "$2a$12$your_hashed_password_here"}}
)
*/