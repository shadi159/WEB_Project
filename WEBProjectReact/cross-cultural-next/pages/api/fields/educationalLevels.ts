import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../utils/db';
import mongoose from 'mongoose';

const EducationalLevelSchema = new mongoose.Schema(
  { level: String },
  { collection: "educationalLevels" } // Explicit collection name
);
const EducationalLevel = mongoose.models.EducationalLevel || mongoose.model("EducationalLevel", EducationalLevelSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();
  const levels = await EducationalLevel.find({});
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(levels);
}
