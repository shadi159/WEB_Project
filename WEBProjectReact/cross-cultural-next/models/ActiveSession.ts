import mongoose from 'mongoose';

const activeSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true }, // A unique ID for this session
    mentorUserId: { type: String, required: true },
    mentorSocketIoId: { type: String, required: true },
    userUserId: { type: String, required: true },
    userSocketIoId: { type: String, required: true },
    sessionType: { type: String, required: true, enum: ['chat', 'video'] },
    firebaseSessionPath: { type: String, required: true, unique: true }, // Path in RTDB for this session
    startTime: { type: Date, default: Date.now },
    endTime: Date,
    status: { type: String, default: 'active', enum: ['active', 'ended'] },
  },
  { timestamps: true }
);

const ActiveSession = mongoose.models.ActiveSession || mongoose.model('ActiveSession', activeSessionSchema);

export default ActiveSession;