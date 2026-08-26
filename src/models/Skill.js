import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'pending_review', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true },
);

skillSchema.pre('validate', function normalizeSkill() {
  if (this.name) this.normalizedName = this.name.trim().toLowerCase();
});

export const Skill = mongoose.model('Skill', skillSchema);
