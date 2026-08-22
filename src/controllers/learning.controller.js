import { z } from 'zod';

import { LearningBookmark } from '../models/LearningBookmark.js';
import { LearningResource } from '../models/LearningResource.js';
import { SkillCatalog } from '../models/SkillCatalog.js';
import { awardXp } from '../services/reward.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const updateSkillsSchema = z.object({
  body: z.object({
    skills: z.array(
      z.object({
        name: z.string().min(1),
        currentLevel: z.number().min(0).max(100),
        category: z.string().optional(),
      }),
    ),
  }),
});

export const bookmarkSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    url: z.string().min(3),
    skill: z.string().optional(),
  }),
});

export const skillGaps = asyncHandler(async (req, res) => {
  const role = req.query.role || req.user?.targetRole || 'Senior Frontend Engineer';
  const catalog = await SkillCatalog.findOne({ role });
  if (!catalog) {
    const roles = await SkillCatalog.find().select('role');
    throw new HttpError(
      404,
      `No skill catalog for that role. Try: ${roles.map((item) => item.role).join(', ')}`,
    );
  }
  const levels = new Map(
    (req.user?.skills || []).map((item) => [item.name.toLowerCase(), item.currentLevel]),
  );
  const gaps = catalog.skills.map((skill) => ({
    name: skill.name,
    category: skill.category,
    currentLevel: levels.get(skill.name.toLowerCase()) ?? 0,
    requiredLevel: skill.requiredLevel,
    priority: skill.priority,
    impact: skill.impact,
  }));
  return ok(res, { role: catalog.role, gaps });
});

export const updateSkills = asyncHandler(async (req, res) => {
  req.user.skills = req.validated.body.skills;
  await req.user.save();
  await awardXp(req.user, 5);
  return ok(res, req.user.toPublic());
});

export const listResources = asyncHandler(async (req, res) => {
  const filter = req.query.skill ? { skill: new RegExp(req.query.skill, 'i') } : {};
  const items = await LearningResource.find(filter).sort({ skill: 1, title: 1 });
  return ok(res, items);
});

export const listBookmarks = asyncHandler(async (req, res) => {
  const items = await LearningBookmark.find({ userId: req.user.id }).sort({
    createdAt: -1,
  });
  return ok(res, items);
});

export const addBookmark = asyncHandler(async (req, res) => {
  try {
    const bookmark = await LearningBookmark.create({
      userId: req.user.id,
      ...req.validated.body,
    });
    return created(res, bookmark);
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'Already bookmarked.');
    throw error;
  }
});

export const removeBookmark = asyncHandler(async (req, res) => {
  const bookmark = await LearningBookmark.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (!bookmark) throw new HttpError(404, 'Bookmark not found.');
  return ok(res, { deleted: true });
});
