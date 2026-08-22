import { z } from 'zod';

import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

const skillSchema = z.object({
  name: z.string().trim().min(1),
  currentLevel: z.number().min(0).max(100).optional(),
  category: z.string().optional(),
});

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    headline: z.string().max(120).optional(),
    bio: z.string().max(2000).optional(),
    location: z.string().max(120).optional(),
    avatarUrl: z.string().optional(),
    targetRole: z.string().max(120).optional(),
    experienceYears: z.number().min(0).max(60).optional(),
    skills: z.array(skillSchema).optional(),
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
