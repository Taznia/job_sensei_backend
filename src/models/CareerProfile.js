import mongoose from 'mongoose';

/**
 * Career profile — Module 1 (Adreed Saadad Hasan, 22301190).
 *
 * Deliberately a separate collection rather than extra fields on `User`. The
 * User model is shared by auth, communities, posts, resumes and rewards, so
 * growing it with eight new sections would put every teammate's feature at risk
 * for no benefit. One profile per user, linked by `user`.
 *
 * Field names mirror the Flutter models in
 * lib/shared/models/career_profile_models.dart so the app and API agree without
 * a translation layer.
 *
 * The five list sections are subdocuments, so Mongo gives each entry its own
 * _id. That id is the `entryId` the section routes take, which is what lets one
 * generic route serve all five sections.
 */

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
export const WORK_MODES = ['onsite', 'hybrid', 'remote'];
export const EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  'freelance',
];
export const SALARY_PERIODS = ['hourly', 'monthly', 'yearly'];
export const LINK_KINDS = [
  'website',
  'github',
  'linkedin',
  'behance',
  'dribbble',
  'other',
];

const educationSchema = new mongoose.Schema({
  institution: { type: String, required: true, trim: true },
  degree: { type: String, required: true, trim: true },
  fieldOfStudy: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  isCurrent: { type: Boolean, default: false },
  grade: { type: String, default: null, trim: true },
  description: { type: String, default: null, trim: true },
});

const experienceSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  employmentType: {
    type: String,
    enum: EMPLOYMENT_TYPES,
    default: 'full-time',
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  isCurrent: { type: Boolean, default: false },
  location: { type: String, default: null, trim: true },
  description: { type: String, default: null, trim: true },
  skills: { type: [String], default: [] },
});

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  level: { type: String, enum: SKILL_LEVELS, default: 'intermediate' },
  yearsOfExperience: { type: Number, default: null, min: 0, max: 70 },
  isVerified: { type: Boolean, default: false },
});

const certificationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  issuer: { type: String, required: true, trim: true },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date, default: null },
  credentialId: { type: String, default: null, trim: true },
  credentialUrl: { type: String, default: null, trim: true },
});

const portfolioLinkSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  kind: { type: String, enum: LINK_KINDS, default: 'other' },
});

const salarySchema = new mongoose.Schema(
  {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'BDT', uppercase: true, trim: true },
    period: { type: String, enum: SALARY_PERIODS, default: 'monthly' },
  },
  { _id: false },
);

const preferencesSchema = new mongoose.Schema(
  {
    preferredRoles: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    workModes: [{ type: String, enum: WORK_MODES }],
    employmentTypes: [{ type: String, enum: EMPLOYMENT_TYPES }],
    salary: { type: salarySchema, default: null },
    openToRelocation: { type: Boolean, default: false },
    availableFrom: { type: Date, default: null },
  },
  { _id: false },
);

const careerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    headline: { type: String, default: '', trim: true, maxlength: 160 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: null, trim: true },
    location: { type: String, default: null, trim: true },
    avatarUrl: { type: String, default: null, trim: true },
    about: { type: String, default: null, trim: true, maxlength: 2000 },
    careerGoals: { type: String, default: null, trim: true, maxlength: 2000 },
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    skills: { type: [skillSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    portfolioLinks: { type: [portfolioLinkSchema], default: [] },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const CareerProfile = mongoose.model(
  'CareerProfile',
  careerProfileSchema,
);
