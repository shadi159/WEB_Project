import mongoose from 'mongoose';

const liveUserSchema = new mongoose.Schema( // No 'new' before mongoose.Schema
  {
    userId: { type: String, required: true, unique: true }, // Your actual user ID (e.g., from auth)
    socketIoId: { type: String, required: true }, // The socket.io ID for this specific connection
    role: { type: String, required: true, enum: ['user', 'mentor'] },
    // No specific Firebase client ID needed here, as we listen via userId
    status: { type: String, default: 'online', enum: ['online', 'offline'] },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const LiveUser = mongoose.models.LiveUser || mongoose.model('LiveUser', liveUserSchema);

export default LiveUser;