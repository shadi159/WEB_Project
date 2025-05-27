// models/Post.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment {
  author: { name: string; avatar?: string; initials: string };
  content: string;
  createdAt: Date;
}

export interface IPost extends Document {
  author: { name: string; avatar?: string; initials: string };
  content: string;
  likes: number;
  comments: IComment[];
  shares: number;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>({
  author: { type: Object, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new Schema<IPost>({
  author: { type: Object, required: true },
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  comments: { type: [CommentSchema], default: [] },
  shares: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
