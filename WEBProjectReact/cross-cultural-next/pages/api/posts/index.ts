// pages/api/posts/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {connectToDatabase} from '../../../utils/db';
import { Post } from '../../../models/Post';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === 'GET') {
    const posts = await Post.find().sort({ createdAt: -1 });
    return res.status(200).json(posts);
  }

  if (req.method === 'POST') {
    const { author, content } = req.body;
    if (!author || !content) {
      return res.status(400).json({ error: 'Missing author or content' });
    }
    const newPost = await Post.create({ author, content });
    return res.status(201).json(newPost);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
