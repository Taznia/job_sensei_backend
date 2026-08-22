import { z } from 'zod';

import { Resume } from '../models/Resume.js';
import { persistUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const resumeBodySchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).optional(),
    summary: z.string().optional(),
    experience: z.array(z.string()).optional(),
    education: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
  }),
});

function serialize(resume) {
  const json = resume.toObject();
  json.id = resume.id;
  delete json._id;
  delete json.__v;
  return json;
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return undefined;
}

export const listResumes = asyncHandler(async (req, res) => {
  const items = await Resume.find({ userId: req.user.id }).sort({ updatedAt: -1 });
  return ok(res, items.map(serialize));
});

export const createResume = asyncHandler(async (req, res) => {
  const body = req.body;
  const count = await Resume.countDocuments({ userId: req.user.id });
  const resume = await Resume.create({
    userId: req.user.id,
    title: body.title || 'My resume',
    summary: body.summary || '',
    experience: parseList(body.experience) || [],
    education: parseList(body.education) || [],
    skills: parseList(body.skills) || [],
    fileUrl: req.file ? (await persistUpload(req, req.file)).url : '',
    isDefault: count === 0,
  });
  if (resume.isDefault) {
    req.user.defaultResumeId = resume.id;
    await req.user.save();
  }
  return created(res, serialize(resume));
});

export const getResume = asyncHandler(async (req, res) => {
  const resume = await loadOwnResume(req);
  return ok(res, serialize(resume));
});

export const updateResume = asyncHandler(async (req, res) => {
  const resume = await loadOwnResume(req);
  const body = req.body;
  if (body.title) resume.title = body.title;
  if (body.summary !== undefined) resume.summary = body.summary;
  const experience = parseList(body.experience);
  const education = parseList(body.education);
  const skills = parseList(body.skills);
  if (experience) resume.experience = experience;
  if (education) resume.education = education;
  if (skills) resume.skills = skills;
  if (req.file) resume.fileUrl = (await persistUpload(req, req.file)).url;
  await resume.save();
  return ok(res, serialize(resume));
});

export const deleteResume = asyncHandler(async (req, res) => {
  const resume = await loadOwnResume(req);
  await resume.deleteOne();
  if (req.user.defaultResumeId?.toString() === resume.id) {
    const next = await Resume.findOne({ userId: req.user.id }).sort({ updatedAt: -1 });
    req.user.defaultResumeId = next?.id;
    await req.user.save();
  }
  return ok(res, { deleted: true });
});

export const setDefaultResume = asyncHandler(async (req, res) => {
  const resume = await loadOwnResume(req);
  await Resume.updateMany({ userId: req.user.id }, { $set: { isDefault: false } });
  resume.isDefault = true;
  await resume.save();
  req.user.defaultResumeId = resume.id;
  await req.user.save();
  return ok(res, serialize(resume));
});

async function loadOwnResume(req) {
  const resume = await Resume.findById(req.params.id);
  if (!resume) throw new HttpError(404, 'Resume not found.');
  if (resume.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new HttpError(403, 'You cannot access this resume.');
  }
  return resume;
}
