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
    // Added for Module 3 job search (filter by experience level). Optional with
    // a default, so existing documents and the recruiter create/update flows
    // keep working without change.
    experienceLevel: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'lead'],
      default: 'mid',
      index: true,
    },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    // Module 2 stores what an imported listing says the role involves.
    responsibilities: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    currency: { type: String, default: 'USD' },

    // --- Module 2: imported listings (Remotive / Arbeitnow) ---
    // `internal` means a recruiter posted it here; anything else names the
    // public board it came from.
    source: {
      type: String,
      enum: ['internal', 'remotive', 'arbeitnow'],
      default: 'internal',
      index: true,
    },
    // The board's own id, used to update rather than duplicate on re-sync.
    externalId: { type: String, default: null },
    sourceLink: { type: String, default: null },
    deadline: { type: Date, default: null },
    // When the board published it, which is not when we imported it.
    postedAt: { type: Date, default: Date.now },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Imported listings have no recruiter account on this platform, so the
      // requirement applies only to jobs posted here.
      required() {
        return (this.source ?? 'internal') === 'internal';
      },
    },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true },
);

jobSchema.index({ title: 'text', company: 'text', description: 'text' });

// One row per board listing. Sparse so the many internal posts, which have
// no externalId, do not all collide on null.
jobSchema.index(
  { source: 1, externalId: 1 },
  { unique: true, sparse: true, name: 'job_source_external' },
);

export const Job = mongoose.model('Job', jobSchema);
