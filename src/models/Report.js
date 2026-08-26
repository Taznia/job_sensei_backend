import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'community'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

reportSchema.index(
  { reportedBy: 1, targetType: 1, targetId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

export const Report = mongoose.model('Report', reportSchema);
