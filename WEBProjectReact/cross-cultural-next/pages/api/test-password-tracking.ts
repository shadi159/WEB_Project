// pages/api/test-password-tracking.ts - Test to track password field changes
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../utils/db';
import User from '../../models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'Test API only available in development' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    console.log(`🧪 Testing password tracking for: ${email}`);
    
    const steps = [];
    
    // Step 1: Find the user
    console.log("📍 Step 1: Finding user...");
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    steps.push({
      step: 1,
      action: "Initial user lookup",
      passwordExists: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordPreview: user.password ? user.password.substring(0, 10) + '...' : 'NO PASSWORD'
    });
    
    // Step 2: Test profile update simulation
    console.log("📍 Step 2: Simulating profile update...");
    
    const beforeUpdate = await User.findById(user._id).select('+password');
    steps.push({
      step: 2,
      action: "Before profile update",
      passwordExists: !!beforeUpdate?.password,
      passwordLength: beforeUpdate?.password ? beforeUpdate.password.length : 0
    });
    
    // Simulate a typical profile update (the kind that might be causing the issue)
    const updateData = {
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio || "Test bio update",
      country: user.country || "Test country"
    };
    
    console.log("💾 Performing safe update...");
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('+password');
    
    steps.push({
      step: 3,
      action: "After safe profile update",
      passwordExists: !!updatedUser?.password,
      passwordLength: updatedUser?.password ? updatedUser.password.length : 0,
      updateData: updateData
    });
    
    // Step 3: Test dangerous update patterns
    console.log("📍 Step 3: Testing potentially dangerous update...");
    
    // This is what might be happening in your app - a full document replacement
    const dangerousUpdate = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      bio: "Updated bio",
      country: user.country,
      role: user.role
      // Notice: password field is missing!
    };
    
    // DON'T actually perform this - just simulate
    steps.push({
      step: 4,
      action: "SIMULATION: What would happen with dangerous update",
      wouldRemovePassword: !dangerousUpdate.hasOwnProperty('password'),
      dangerousUpdateData: dangerousUpdate
    });
    
    // Step 4: Check current state
    const finalCheck = await User.findById(user._id).select('+password');
    steps.push({
      step: 5,
      action: "Final state check",
      passwordExists: !!finalCheck?.password,
      passwordLength: finalCheck?.password ? finalCheck.password.length : 0
    });
    
    return res.status(200).json({
      message: 'Password tracking test completed',
      userEmail: email,
      userId: user._id,
      steps: steps,
      summary: {
        passwordCurrentlyExists: !!finalCheck?.password,
        likelyIssue: !dangerousUpdate.hasOwnProperty('password') ? 
          "Profile updates are not including password field" : 
          "Unknown cause"
      }
    });
    
  } catch (error: any) {
    console.error('❌ Password tracking test error:', error);
    return res.status(500).json({
      message: 'Test failed',
      error: error.message
    });
  }
}