// api/posts/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../utils/db';
import { Post } from '../../../models/Post';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === 'GET') {
    try {
      // Get all posts
      const posts = await Post.find({})
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json(posts);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }
  }

  if (req.method === 'POST') {
    // Create new post
    const { author, content } = req.body;
    
    if (!author || !content?.trim()) {
      return res.status(400).json({ error: 'Author and content are required' });
    }
    
    try {
      const newPost = new Post({
        author,
        content: content.trim(),
        likes: 0,
        shares: 0,
        comments: [],
        createdAt: new Date()
      });
      
      const savedPost = await newPost.save();
      return res.status(201).json(savedPost);
    } catch (error) {
      console.error('Failed to create post:', error);
      return res.status(500).json({ error: 'Failed to create post' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}