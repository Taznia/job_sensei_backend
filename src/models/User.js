import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    currentLevel: { type: Number, min: 0, max: 100, default: 0 },
    category: { type: String, default: 'Technical skill' },
    yearsOfExperience: { type: Number, min: 0 },
    isVerified: { type: Boolean, default: false },
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
    organizationName: { type: String, default: '', trim: true, maxlength: 120 },
    employerStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'verified', 'rejected'],
      default: 'not_applicable',
    },
    headline: { type: String, default: '', maxlength: 120 },
    bio: { type: String, default: '', maxlength: 2000 },
    location: { type: String, default: '', maxlength: 120 },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    careerGoals: { type: String, default: '' },
    targetRole: { type: String, default: 'Senior Frontend Engineer' },
    experienceYears: { type: Number, default: 0, min: 0 },
    skills: { type: [skillSchema], default: [] },
    education: { type: [mongoose.Schema.Types.Mixed], default: [] },
    experience: { type: [mongoose.Schema.Types.Mixed], default: [] },
    certifications: { type: [mongoose.Schema.Types.Mixed], default: [] },
    portfolioLinks: { type: [mongoose.Schema.Types.Mixed], default: [] },
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
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
    organizationName: this.organizationName,
    employerStatus: this.employerStatus,
    headline: this.headline,
    bio: this.bio,
    location: this.location,
    avatarUrl: this.avatarUrl,
    phone: this.phone,
    careerGoals: this.careerGoals,
    targetRole: this.targetRole,
    experienceYears: this.experienceYears,
    skills: this.skills,
    education: this.education,
    experience: this.experience,
    certifications: this.certifications,
    portfolioLinks: this.portfolioLinks,
    preferences: this.preferences,
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
