import { z } from 'zod';

import { LearningPath } from '../models/LearningPath.js';
import { LearningResource } from '../models/LearningResource.js';
import { Lesson } from '../models/Lesson.js';
import { Skill } from '../models/Skill.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const createSkillSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(100),
    description: z.string().max(1000).optional(),
    status: z.enum(['active', 'pending_review', 'archived']).optional(),
  }),
});

export const createPathSchema = z.object({
  body: z.object({
    skillId: z.string().min(1),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(3000),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedDuration: z.string().trim().min(1).max(80),
  }),
});

export const updatePathSchema = z.object({
  body: createPathSchema.shape.body
    .omit({ skillId: true })
    .partial()
    .extend({ status: z.enum(['draft', 'published', 'archived']).optional() }),
});

export const lessonSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().min(5).max(3000),
    orderIndex: z.number().int().min(1),
    estimatedDuration: z.string().trim().min(1).max(80).optional(),
  }),
});

export const updateLessonSchema = z.object({
  body: lessonSchema.shape.body.partial(),
});

export const resourceSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    url: z.string().url(),
    platform: z.enum(['youtube', 'article', 'documentation', 'other']),
    resourceType: z.enum(['video', 'article', 'documentation', 'course']),
    creator: z.string().trim().max(120).optional(),
    duration: z.string().trim().max(80).optional(),
    thumbnailUrl: z.string().url().optional(),
  }),
});

export const listSkills = asyncHandler(async (_req, res) => {
  const skills = await Skill.find({ status: 'active' }).sort({ name: 1 });
  return ok(res, skills.map(serializeSkill));
});

export const listPathsForSkill = asyncHandler(async (req, res) => {
  const skill = await loadSkill(req.params.skillId);
  const paths = await LearningPath.find({
    skillId: skill.id,
    status: 'published',
  }).sort({ difficulty: 1, title: 1 });
  return ok(res, {
    skill: serializeSkill(skill),
    paths: await Promise.all(paths.map(serializePathSummary)),
  });
});

export const getPath = asyncHandler(async (req, res) => {
  const path = await LearningPath.findOne({
    _id: req.params.pathId,
    status: 'published',
  }).populate('skillId');
  if (!path) throw new HttpError(404, 'Published learning path not found.');
  return ok(res, await serializePathDetails(path));
});

export const createSkill = asyncHandler(async (req, res) => {
  try {
    const skill = await Skill.create(req.validated.body);
    return created(res, serializeSkill(skill));
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, 'Skill already exists.');
    throw error;
  }
});

export const createPath = asyncHandler(async (req, res) => {
  const skill = await Skill.findById(req.validated.body.skillId);
  if (!skill) throw new HttpError(404, 'Skill not found.');
  const path = await LearningPath.create({
    ...req.validated.body,
    createdBy: req.user.id,
    status: 'draft',
  });
  return created(res, await serializePathSummary(path));
});

export const updatePath = asyncHandler(async (req, res) => {
  const path = await LearningPath.findByIdAndUpdate(
    req.params.pathId,
    req.validated.body,
    { new: true, runValidators: true },
  );
  if (!path) throw new HttpError(404, 'Learning path not found.');
  return ok(res, await serializePathSummary(path));
});

export const publishPath = asyncHandler(async (req, res) => {
  const path = await LearningPath.findById(req.params.pathId);
  if (!path) throw new HttpError(404, 'Learning path not found.');
  const lessonCount = await Lesson.countDocuments({ learningPathId: path.id });
  if (lessonCount === 0) {
    throw new HttpError(400, 'Add at least one lesson before publishing.');
  }
  path.status = 'published';
  await path.save();
  return ok(res, await serializePathSummary(path));
});

export const addLesson = asyncHandler(async (req, res) => {
  const path = await LearningPath.findById(req.params.pathId);
  if (!path) throw new HttpError(404, 'Learning path not found.');
  try {
    const lesson = await Lesson.create({
      ...req.validated.body,
      learningPathId: path.id,
    });
    return created(res, serializeLesson(lesson, []));
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, 'Another lesson already uses that order number.');
    }
    throw error;
  }
});

export const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByIdAndUpdate(
    req.params.lessonId,
    req.validated.body,
    { new: true, runValidators: true },
  );
  if (!lesson) throw new HttpError(404, 'Lesson not found.');
  return ok(res, serializeLesson(lesson, []));
});

export const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByIdAndDelete(req.params.lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found.');
  await LearningResource.deleteMany({ lessonId: lesson.id });
  return ok(res, { deleted: true });
});

export const addResource = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found.');
  const resource = await LearningResource.create({
    ...req.validated.body,
    lessonId: lesson.id,
  });
  return created(res, serializeResource(resource));
});

export const deleteResource = asyncHandler(async (req, res) => {
  const resource = await LearningResource.findByIdAndDelete(req.params.resourceId);
  if (!resource) throw new HttpError(404, 'Learning resource not found.');
  return ok(res, { deleted: true });
});

async function loadSkill(value) {
  const normalized = decodeURIComponent(value).trim().toLowerCase();
  const skill = value.match(/^[a-f\d]{24}$/i)
    ? await Skill.findById(value)
    : await Skill.findOne({ normalizedName: normalized });
  if (!skill || skill.status !== 'active') {
    throw new HttpError(404, 'Active skill not found.');
  }
  return skill;
}

function serializeSkill(skill) {
  return {
    id: skill.id,
    name: skill.name,
    normalizedName: skill.normalizedName,
    category: skill.category,
    description: skill.description,
    status: skill.status,
  };
}

async function serializePathSummary(path) {
  const [skill, lessonCount] = await Promise.all([
    path.populated('skillId')
      ? Promise.resolve(path.skillId)
      : Skill.findById(path.skillId),
    Lesson.countDocuments({ learningPathId: path.id }),
  ]);
  return {
    id: path.id,
    skill: skill ? serializeSkill(skill) : null,
    title: path.title,
    description: path.description,
    difficulty: path.difficulty,
    estimatedDuration: path.estimatedDuration,
    status: path.status,
    lessonCount,
  };
}

async function serializePathDetails(path) {
  const lessons = await Lesson.find({ learningPathId: path.id }).sort({
    orderIndex: 1,
  });
  const resources = await LearningResource.find({
    lessonId: { $in: lessons.map((lesson) => lesson.id) },
  }).sort({ createdAt: 1 });
  const grouped = Map.groupBy(resources, (item) => item.lessonId.toString());
  return {
    ...(await serializePathSummary(path)),
    lessons: lessons.map((lesson) =>
      serializeLesson(lesson, grouped.get(lesson.id) || []),
    ),
  };
}

function serializeLesson(lesson, resources) {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    orderIndex: lesson.orderIndex,
    estimatedDuration: lesson.estimatedDuration,
    resources: resources.map(serializeResource),
  };
}

function serializeResource(resource) {
  return {
    id: resource.id,
    title: resource.title,
    url: resource.url,
    platform: resource.platform,
    resourceType: resource.resourceType,
    creator: resource.creator,
    duration: resource.duration,
    thumbnailUrl: resource.thumbnailUrl,
  };
}
