import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '' },
    experience: { type: [String], default: [] },
    education: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    fileUrl: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },

    // --- Resume builder (Module: resume authoring + PDF export) -----------
    // All optional with defaults, so every document written before this block
    // existed stays valid and the original create/update flow is unaffected.
    targetField: { type: String, default: '' },
    template: { type: String, default: 'Professional' },

    fullName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    portfolio: { type: String, default: '' },

    projects: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const Resume = mongoose.model('Resume', resumeSchema);
