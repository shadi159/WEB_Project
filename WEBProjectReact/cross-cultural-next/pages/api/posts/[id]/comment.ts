// pages/api/posts/[id]/comment.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {connectToDatabase} from '../../../../utils/db';
import { Post } from '../../../../models/Post';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === 'POST') {
    const { id } = req.query;
    const { author, content } = req.body;
    if (!content || !author) {
      return res.status(400).json({ error: 'Missing author or content' });
    }
    const updated = await Post.findByIdAndUpdate(
      id,
      { $push: { comments: { author, content, createdAt: new Date() } } },
      { new: true }
    );
    return updated
      ? res.status(200).json(updated)
      : res.status(404).json({ error: 'Post not found' });
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
