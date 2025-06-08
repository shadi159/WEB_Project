import mongoose from 'mongoose';

const mentorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    expertise: { type: String, required: true },
    bio: String,
    avatar: String,
    available: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Mentor = mongoose.models.Mentor || mongoose.model('Mentor', mentorSchema);

export default Mentor;