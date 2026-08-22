import { z } from 'zod';

import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const createJobSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3),
    company: z.string().trim().min(2),
    location: z.string().trim().min(2),
    type: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
    workMode: z.enum(['onsite', 'remote', 'hybrid']).optional(),
    description: z.string().min(20),
    requirements: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    currency: z.string().optional(),
  }),
});

export const updateJobSchema = z.object({
  body: createJobSchema.shape.body.partial().extend({
    status: z.enum(['open', 'closed']).optional(),
  }),
});

function serializeJob(job, savedIds = []) {
  const json = job.toObject({ virtuals: true });
  json.id = job.id;
  json.isSaved = savedIds.some((id) => id.toString() === job.id);
  delete json._id;
  delete json.__v;
  return json;
}

export const listJobs = asyncHandler(async (req, res) => {
  const { q, location, type, workMode, skill, page = 1, limit = 20 } = req.query;
  const filter = { status: 'open' };
  if (location) filter.location = new RegExp(location, 'i');
  if (type) filter.type = type;
  if (workMode) filter.workMode = workMode;
  if (skill) filter.skills = new RegExp(skill, 'i');
  if (q) {
    filter.$or = [
      { title: new RegExp(q, 'i') },
      { company: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Job.countDocuments(filter),
  ]);
  const saved = req.user?.savedJobs || [];
  return ok(res, {
    items: items.map((job) => serializeJob(job, saved)),
    total,
    page: Number(page),
    limit: Number(limit),
  });
});

export const recommendedJobs = asyncHandler(async (req, res) => {
  const skills = (req.user.skills || []).map((item) => item.name);
  const filter = { status: 'open' };
  const or = [
    ifSkills(skills),
    req.user.targetRole
      ? { title: new RegExp(req.user.targetRole.split(' ').slice(-1)[0], 'i') }
      : null,
  ].filter(Boolean);
  if (or.length) filter.$or = or;
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).limit(20);
  return ok(res, jobs.map((job) => serializeJob(job, req.user.savedJobs)));
});

function ifSkills(skills) {
  if (!skills.length) return null;
  return { skills: { $in: skills.map((name) => new RegExp(name, 'i')) } };
}

export const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found.');
  return ok(res, serializeJob(job, req.user?.savedJobs || []));
});

export const createJob = asyncHandler(async (req, res) => {
  const job = await Job.create({ ...req.validated.body, recruiterId: req.user.id });
  return created(res, serializeJob(job));
});

export const updateJob = asyncHandler(async (req, res) => {
  const job = await loadOwnedJob(req);
  Object.assign(job, req.validated.body);
  await job.save();
  return ok(res, serializeJob(job, req.user.savedJobs));
});

export const deleteJob = asyncHandler(async (req, res) => {
  const job = await loadOwnedJob(req);
  await job.deleteOne();
  return ok(res, { deleted: true });
});

export const savedJobs = asyncHandler(async (req, res) => {
  await req.user.populate('savedJobs');
  return ok(res, (req.user.savedJobs || []).map((job) => serializeJob(job, req.user.savedJobs)));
});

export const saveJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found.');
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { savedJobs: job.id } });
  return ok(res, { saved: true });
});

export const unsaveJob = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { $pull: { savedJobs: req.params.id } });
  return ok(res, { saved: false });
});

async function loadOwnedJob(req) {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found.');
  if (req.user.role !== 'admin' && job.recruiterId.toString() !== req.user.id) {
    throw new HttpError(403, 'You cannot edit this job.');
  }
  return job;
}
