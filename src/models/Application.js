import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    coverLetter: { type: String, default: '', maxlength: 5000 },
    status: {
      type: String,
      enum: ['applied', 'reviewing', 'interview', 'offer', 'rejected', 'withdrawn'],
      default: 'applied',
    },
  },
  { timestamps: true },
);

applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });

export const Application = mongoose.model('Application', applicationSchema);
