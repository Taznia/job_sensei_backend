import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },
    experience: { type: [String], default: [] },
    education: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    fileUrl: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Resume = mongoose.model('Resume', resumeSchema);
