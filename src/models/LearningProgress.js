import mongoose from 'mongoose';

const learningProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    learningPathId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath', required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningResource', required: true },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    lastOpenedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

learningProgressSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

export const LearningProgress = mongoose.model('LearningProgress', learningProgressSchema);
