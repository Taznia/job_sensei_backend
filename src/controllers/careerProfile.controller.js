import { z } from 'zod';

import {
  CareerProfile,
  EMPLOYMENT_TYPES,
  LINK_KINDS,
  SALARY_PERIODS,
  SKILL_LEVELS,
  WORK_MODES,
} from '../models/CareerProfile.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { computeCompleteness } from '../utils/profileCompleteness.js';

/**
 * Career Profile — Module 1 (Adreed Saadad Hasan, 22301190).
 *
 * All routes act on the authenticated user's own profile, so there is no userId
 * in the path: one user cannot read or edit another's career record.
 *
 * The five list sections are all "array of subdocuments on one profile", so
 * instead of fifteen near-identical routes they share three generic ones keyed
 * by a `:section` segment. SECTION_FIELDS is the allow-list that maps that
 * segment to a schema path — without it, `:section` would be a way to write to
 * any field on the document.
 */
const SECTION_FIELDS = {
  education: 'education',
  experience: 'experience',
  skills: 'skills',
  certifications: 'certifications',
  'portfolio-links': 'portfolioLinks',
};

/* ------------------------------------------------------------ validation --- */

const isoDate = z.coerce.date();

const sectionBodies = {
  education: z.object({
    institution: z.string().trim().min(1).max(160),
    degree: z.string().trim().min(1).max(120),
    fieldOfStudy: z.string().trim().min(1).max(120),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
    isCurrent: z.boolean().optional(),
    grade: z.string().max(80).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
  }),
  experience: z.object({
    company: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(120),
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
    isCurrent: z.boolean().optional(),
    location: z.string().max(120).nullable().optional(),
    description: z.string().max(1000).nullable().optional(),
    skills: z.array(z.string().trim().min(1)).optional(),
  }),
  skills: z.object({
    name: z.string().trim().min(1).max(80),
    level: z.enum(SKILL_LEVELS).optional(),
    yearsOfExperience: z.number().min(0).max(70).nullable().optional(),
    isVerified: z.boolean().optional(),
  }),
  certifications: z.object({
    name: z.string().trim().min(1).max(160),
    issuer: z.string().trim().min(1).max(160),
    issueDate: isoDate,
    expiryDate: isoDate.nullable().optional(),
    credentialId: z.string().max(120).nullable().optional(),
    credentialUrl: z.string().url().nullable().optional(),
  }),
  'portfolio-links': z.object({
    label: z.string().trim().min(1).max(80),
    url: z.string().url(),
    kind: z.enum(LINK_KINDS).optional(),
  }),
};

const sectionParam = z.enum(Object.keys(SECTION_FIELDS));

export const updateBasicsSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(80).optional(),
    headline: z.string().max(160).optional(),
    email: z.string().email().optional(),
    // Nullable so clearing an optional field is expressible; see below.
    phone: z.string().max(40).nullable().optional(),
    location: z.string().max(120).nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    about: z.string().max(2000).nullable().optional(),
    careerGoals: z.string().max(2000).nullable().optional(),
  }),
});

export const updatePreferencesSchema = z.object({
  body: z
    .object({
      preferredRoles: z.array(z.string().trim().min(1)).default([]),
      preferredLocations: z.array(z.string().trim().min(1)).default([]),
      workModes: z.array(z.enum(WORK_MODES)).default([]),
      employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).default([]),
      salary: z
        .object({
          min: z.number().min(0),
          max: z.number().min(0),
          currency: z.string().trim().length(3).optional(),
          period: z.enum(SALARY_PERIODS).optional(),
        })
        .nullable()
        .optional(),
      openToRelocation: z.boolean().default(false),
      availableFrom: isoDate.nullable().optional(),
    })
    // Zod cannot express "max >= min" inside the object shape, so it is a
    // refinement. Returning 400 here beats storing an impossible range.
    .refine((v) => !v.salary || v.salary.max >= v.salary.min, {
      message: 'salary.max cannot be lower than salary.min',
      path: ['salary', 'max'],
    }),
});

export const sectionCreateSchema = z.object({
  params: z.object({ section: sectionParam }),
  body: z.record(z.string(), z.unknown()),
});

export const sectionUpdateSchema = z.object({
  params: z.object({
    section: sectionParam,
    entryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid entry id'),
  }),
  body: z.record(z.string(), z.unknown()),
});

export const sectionDeleteSchema = z.object({
  params: z.object({
    section: sectionParam,
    entryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid entry id'),
  }),
});

/* --------------------------------------------------------------- helpers --- */

/**
 * Loads the caller's profile, creating it on first access from what the User
 * record already knows. A brand new account would otherwise 404 on the very
 * first request the profile screen makes.
 */
async function loadOrCreateProfile(user) {
  const existing = await CareerProfile.findOne({ user: user.id });
  if (existing) return existing;

  return CareerProfile.create({
    user: user.id,
    fullName: user.name,
    email: user.email,
    headline: user.headline || '',
    location: user.location || null,
    avatarUrl: user.avatarUrl || null,
    about: user.bio || null,
    // Seed preferences from the thin profile the rest of the app already keeps.
    preferences: {
      preferredRoles: user.targetRole ? [user.targetRole] : [],
    },
    skills: (user.skills || []).map((skill) => ({ name: skill.name })),
  });
}

/** Every profile response carries completeness, so clients never recompute it. */
function serialize(profile) {
  const plain = profile.toObject({ versionKey: false });
  return { ...plain, completeness: computeCompleteness(plain) };
}

/** Validates a section body against that section's own shape. */
function parseSectionBody(section, body, { partial }) {
  const base = sectionBodies[section];
  const schema = partial ? base.partial() : base;
  const parsed = schema.safeParse(body ?? {});
  // Thrown as-is: errorHandler already turns a ZodError into a 400 carrying the
  // first issue's message, and HttpError has no slot for issue details.
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

/* ------------------------------------------------------------- handlers --- */

/** GET /api/career-profile/me */
export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await loadOrCreateProfile(req.user);
  return ok(res, serialize(profile));
});

/** PUT /api/career-profile/me */
export const updateBasics = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  if (Object.keys(body).length === 0) {
    throw new HttpError(400, 'Request body is empty.');
  }

  const profile = await loadOrCreateProfile(req.user);

  for (const [field, value] of Object.entries(body)) {
    // An explicit null clears an optional field. fullName and email are
    // required, and Zod already rejects empty strings for them.
    profile[field] = value === '' ? null : value;
  }

  await profile.save();
  return ok(res, serialize(profile));
});

/** PUT /api/career-profile/me/preferences */
export const updatePreferences = asyncHandler(async (req, res) => {
  const profile = await loadOrCreateProfile(req.user);
  const body = req.validated.body;

  // Replaced wholesale, not merged: the preferences form always submits the
  // full object, and a partial merge would make removing a role impossible.
  profile.preferences = {
    preferredRoles: body.preferredRoles,
    preferredLocations: body.preferredLocations,
    workModes: body.workModes,
    employmentTypes: body.employmentTypes,
    salary: body.salary ?? null,
    openToRelocation: body.openToRelocation,
    availableFrom: body.availableFrom ?? null,
  };

  await profile.save();
  return ok(res, serialize(profile));
});

/** POST /api/career-profile/me/sections/:section */
export const addSectionEntry = asyncHandler(async (req, res) => {
  const { section } = req.validated.params;
  const field = SECTION_FIELDS[section];
  const entry = parseSectionBody(section, req.body, { partial: false });

  const profile = await loadOrCreateProfile(req.user);
  profile[field].push(entry);
  await profile.save();

  const saved = profile[field][profile[field].length - 1];
  return created(res, {
    entry: saved,
    completeness: computeCompleteness(profile.toObject()),
  });
});

/** PUT /api/career-profile/me/sections/:section/:entryId */
export const updateSectionEntry = asyncHandler(async (req, res) => {
  const { section, entryId } = req.validated.params;
  const field = SECTION_FIELDS[section];
  const patch = parseSectionBody(section, req.body, { partial: true });

  const profile = await loadOrCreateProfile(req.user);
  const entry = profile[field].id(entryId);
  if (!entry) throw new HttpError(404, `No ${section} entry with id ${entryId}.`);

  entry.set(patch);
  await profile.save();

  return ok(res, {
    entry,
    completeness: computeCompleteness(profile.toObject()),
  });
});

/** DELETE /api/career-profile/me/sections/:section/:entryId */
export const deleteSectionEntry = asyncHandler(async (req, res) => {
  const { section, entryId } = req.validated.params;
  const field = SECTION_FIELDS[section];

  const profile = await loadOrCreateProfile(req.user);
  const entry = profile[field].id(entryId);
  if (!entry) throw new HttpError(404, `No ${section} entry with id ${entryId}.`);

  entry.deleteOne();
  await profile.save();

  return ok(res, {
    deleted: true,
    removedId: entryId,
    remaining: profile[field].length,
    completeness: computeCompleteness(profile.toObject()),
  });
});

/** GET /api/career-profile/me/completeness */
export const getCompleteness = asyncHandler(async (req, res) => {
  const profile = await loadOrCreateProfile(req.user);
  return ok(res, computeCompleteness(profile.toObject()));
});
