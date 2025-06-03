// api/posts/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../utils/db';
import { Post } from '../../../models/Post';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();
  
  const { id } = req.query;

  // Validate MongoDB ObjectId
  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ error: 'Invalid post ID' });
  }

  if (req.method === 'GET') {
    try {
      // Get specific post by ID
      const post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      return res.status(200).json(post);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      return res.status(500).json({ error: 'Failed to fetch post' });
    }
  }

  if (req.method === 'PUT') {
    // Edit post
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    try {
      const updated = await Post.findByIdAndUpdate(
        id,
        { 
          content: content.trim(), 
          updatedAt: new Date() 
        },
        { new: true }
      );
      
      if (!updated) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      return res.status(200).json(updated);
    } catch (error) {
      console.error('Failed to update post:', error);
      return res.status(500).json({ error: 'Failed to update post' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete post
    try {
      const deleted = await Post.findByIdAndDelete(id);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      return res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Failed to delete post:', error);
      return res.status(500).json({ error: 'Failed to delete post' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}