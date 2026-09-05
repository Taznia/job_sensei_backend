import mongoose from 'mongoose';

/**
 * A saved AI Resume Match analysis.
 *
 * This is distinct from the job match score in `jobMatch.service.js`: that one
 * rule-scores a resume against a `Job` document already stored in Job Sensei.
 * This one sends a resume plus a free-text job description the user pasted in
 * to Gemini, and keeps the structured advice that comes back.
 *
 * Analyses are treated as immutable history — created and read, never edited —
 * so no update route is exposed for them.
 */

const projectHighlightSchema = new mongoose.Schema(
  {
    project: { type: String, default: '' },
    reason: { type: String, default: '' },
    suggestedBullets: { type: [String], default: [] },
  },
  { _id: false },
);

const aiResumeMatchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    resumeTitle: { type: String, default: '' },
    jobDescription: { type: String, default: '' },

    matchScore: { type: Number, default: 0, min: 0, max: 100 },
    strongKeywords: { type: [String], default: [] },
    recommendedKeywords: { type: [String], default: [] },
    projectHighlights: { type: [projectHighlightSchema], default: [] },
    skillOrdering: { type: [String], default: [] },
    summaryImprovement: { type: String, default: '' },
    overallFeedback: { type: String, default: '' },
    strengths: { type: [String], default: [] },
    gaps: { type: [String], default: [] },
  },
  { timestamps: true },
);

// History is always read newest-first, optionally narrowed to one resume.
aiResumeMatchSchema.index({ userId: 1, createdAt: -1 });
aiResumeMatchSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });

export const AiResumeMatch = mongoose.model('AiResumeMatch', aiResumeMatchSchema);
