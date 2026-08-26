import { z } from 'zod';

import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { Post } from '../models/Post.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { Community } from '../models/Community.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const updateUserSchema = z.object({
  body: z.object({
    role: z.enum(['seeker', 'recruiter', 'admin']).optional(),
    isBanned: z.boolean().optional(),
    employerStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  }),
});

export const stats = asyncHandler(async (req, res) => {
  const [users, jobs, applications, posts, communities] = await Promise.all([
    User.countDocuments(),
    Job.countDocuments(),
    Application.countDocuments(),
    Post.countDocuments(),
    Community.countDocuments(),
  ]);
  return ok(res, { users, jobs, applications, posts, communities });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(200);
  return ok(res, users.map((user) => user.toPublic()));
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found.');
  Object.assign(user, req.validated.body);
  await user.save();
  return ok(res, user.toPublic());
});

export const listReports = asyncHandler(async (_req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 }).limit(200);
  return ok(res, reports);
});
export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new HttpError(404, 'Post not found.');
  await post.deleteOne();
  return ok(res, { deleted: true });
});
