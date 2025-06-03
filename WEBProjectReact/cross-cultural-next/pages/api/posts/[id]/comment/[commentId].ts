// api/posts/[id]/comment/[commentId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../../../utils/db';
import { Post } from '../../../../../models/Post';
import mongoose from 'mongoose';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();
  
  const { id, commentId } = req.query;

  // Validate MongoDB ObjectIds
  if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
    return res.status(400).json({ error: 'Invalid post ID' });
  }
  
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId as string)) {
    return res.status(400).json({ error: 'Invalid comment ID' });
  }

  if (req.method === 'PUT') {
    // Edit comment
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    try {
      const updated = await Post.findOneAndUpdate(
        { 
          _id: id, 
          'comments._id': commentId 
        },
        { 
          $set: { 
            'comments.$.content': content.trim(),
            'comments.$.updatedAt': new Date()
          }
        },
        { new: true }
      );
      
      if (!updated) {
        return res.status(404).json({ error: 'Post or comment not found' });
      }
      
      return res.status(200).json(updated);
    } catch (error) {
      console.error('Failed to update comment:', error);
      return res.status(500).json({ error: 'Failed to update comment' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete comment
    try {
      const updated = await Post.findByIdAndUpdate(
        id,
        { $pull: { comments: { _id: commentId } } },
        { new: true }
      );
      
      if (!updated) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      return res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Failed to delete comment:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}