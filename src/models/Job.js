import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      default: 'full-time',
    },
    workMode: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid'],
      default: 'hybrid',
    },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    currency: { type: String, default: 'USD' },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true },
);

jobSchema.index({ title: 'text', company: 'text', description: 'text' });

export const Job = mongoose.model('Job', jobSchema);
