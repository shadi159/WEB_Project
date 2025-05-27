// pages/api/posts/[id]/share.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {connectToDatabase} from '../../../../utils/db';
import { Post } from '../../../../models/Post';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();

  if (req.method === 'POST') {
    const { id } = req.query;
    const updated = await Post.findByIdAndUpdate(id, { $inc: { shares: 1 } }, { new: true });
    return updated
      ? res.status(200).json(updated)
      : res.status(404).json({ error: 'Post not found' });
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
