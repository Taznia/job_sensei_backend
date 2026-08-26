import mongoose from 'mongoose';

const learningResourceSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      index: true,
    },
    title: { type: String, required: true },
    creator: { type: String, default: 'Job Sensei Learning' },
    skill: { type: String, default: '' },
    platform: {
      type: String,
      enum: ['youtube', 'article', 'documentation', 'other'],
      default: 'other',
    },
    resourceType: {
      type: String,
      enum: ['video', 'article', 'documentation', 'course'],
      default: 'video',
    },
    thumbnailUrl: { type: String },
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
