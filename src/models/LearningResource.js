import mongoose from 'mongoose';

const learningResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    creator: { type: String, required: true },
    skill: { type: String, required: true },
    duration: { type: String, default: 'Self-paced' },
    difficulty: { type: String, default: 'Recommended' },
    url: { type: String, required: true },
  },
  { timestamps: true },
);

export const LearningResource = mongoose.model(
  'LearningResource',
  learningResourceSchema,
);
