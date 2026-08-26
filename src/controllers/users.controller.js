import { z } from 'zod';

import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

const skillSchema = z.object({
  name: z.string().trim().min(1),
  currentLevel: z.number().min(0).max(100).optional(),
  category: z.string().optional(),
  yearsOfExperience: z.number().min(0).optional(),
  isVerified: z.boolean().optional(),
});

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    headline: z.string().max(120).optional(),
    bio: z.string().max(2000).optional(),
    location: z.string().max(120).optional(),
    avatarUrl: z.string().optional(),
    phone: z.string().max(40).optional(),
    careerGoals: z.string().max(2000).optional(),
    targetRole: z.string().max(120).optional(),
    experienceYears: z.number().min(0).max(60).optional(),
    skills: z.array(skillSchema).optional(),
    education: z.array(z.record(z.unknown())).optional(),
    experience: z.array(z.record(z.unknown())).optional(),
    certifications: z.array(z.record(z.unknown())).optional(),
    portfolioLinks: z.array(z.record(z.unknown())).optional(),
    preferences: z.record(z.unknown()).optional(),
  }),
});

export const getMe = asyncHandler(async (req, res) => {
  return ok(res, req.user.toPublic());
});

export const updateMe = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  Object.assign(req.user, body);
  await req.user.save();
  return ok(res, req.user.toPublic());
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.isBanned) throw new HttpError(404, 'User not found.');
  const profile = user.toPublic();
  delete profile.email;
  delete profile.savedJobs;
  return ok(res, profile);
});
