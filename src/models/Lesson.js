import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    learningPathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    orderIndex: { type: Number, required: true, min: 1 },
    estimatedDuration: { type: String, default: '30 min' },
  },
  { timestamps: true },
);

lessonSchema.index({ learningPathId: 1, orderIndex: 1 }, { unique: true });

export const Lesson = mongoose.model('Lesson', lessonSchema);
