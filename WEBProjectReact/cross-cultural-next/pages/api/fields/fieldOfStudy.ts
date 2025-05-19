import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../utils/db';
import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema(
  { name: String },
  { collection: "fieldOfStudy" } // Explicit collection name
);
const FieldOfStudy = mongoose.models.FieldOfStudy || mongoose.model("FieldOfStudy", FieldSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();
  const fields = await FieldOfStudy.find({});
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(fields);
}
