import mongoose from 'mongoose';

const learningBookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true },
    url: { type: String, required: true },
    skill: { type: String, default: '' },
  },
  { timestamps: true },
);

learningBookmarkSchema.index({ userId: 1, url: 1 }, { unique: true });

export const LearningBookmark = mongoose.model(
  'LearningBookmark',
  learningBookmarkSchema,
);
