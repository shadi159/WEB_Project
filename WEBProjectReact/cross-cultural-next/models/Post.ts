import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  author: {
    name: { type: String, required: true },
    avatar: String,
    initials: { type: String, required: true }
  },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  author: {
    name: { type: String, required: true },
    avatar: String,
    initials: { type: String, required: true }
  },
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: [CommentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);