import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, required: true },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    // Set when the user applied to a Job posting inside Job Sensei. Absent for
    // an application the user tracks manually (applied on LinkedIn, by email,
    // on a company site...), which is what the Application Tracker adds.
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
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
      // 'shortlisted' is added for the tracker's timeline. Every value that
      // existed before is still valid, so stored documents keep working.
      enum: [
        'applied',
        'reviewing',
        'shortlisted',
        'interview',
        'offer',
        'rejected',
        'withdrawn',
      ],
      default: 'applied',
    },

    // --- Application Tracker ---------------------------------------------
    // Free-text details for applications made outside Job Sensei. Optional, so
    // job-board applications are unaffected.
    jobTitle: { type: String, default: '' },
    companyName: { type: String, default: '' },
    resumeTitle: { type: String, default: '' },
    targetField: { type: String, default: '' },
    interviewDate: { type: Date, default: null },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true },
);

// One application per job per user still holds for job-board applications.
// The partial filter lifts it for tracked ones, which have no jobId - without
// it every user could only ever track a single manual application.
applicationSchema.index(
  { jobId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { jobId: { $type: 'objectId' } },
    name: 'jobId_1_userId_1_partial',
  },
);
applicationSchema.index({ userId: 1, createdAt: -1 });

export const Application = mongoose.model('Application', applicationSchema);
