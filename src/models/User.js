import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    currentLevel: { type: Number, min: 0, max: 100, default: 0 },
    category: { type: String, default: 'Technical skill' },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['seeker', 'recruiter', 'admin'],
      default: 'seeker',
    },
    headline: { type: String, default: '', maxlength: 120 },
    bio: { type: String, default: '', maxlength: 2000 },
    location: { type: String, default: '', maxlength: 120 },
    avatarUrl: { type: String, default: '' },
    targetRole: { type: String, default: 'Senior Frontend Engineer' },
    experienceYears: { type: Number, default: 0, min: 0 },
    skills: { type: [skillSchema], default: [] },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    defaultResumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    xp: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    isBanned: { type: Boolean, default: false },
    otpHash: { type: String },
    otpExpires: { type: Date },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    role: this.role,
    headline: this.headline,
    bio: this.bio,
    location: this.location,
    avatarUrl: this.avatarUrl,
    targetRole: this.targetRole,
    experienceYears: this.experienceYears,
    skills: this.skills,
    savedJobs: this.savedJobs,
    defaultResumeId: this.defaultResumeId,
    xp: this.xp,
    badges: this.badges,
    createdAt: this.createdAt,
  };
};

userSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10);
};

export const User = mongoose.model('User', userSchema);
