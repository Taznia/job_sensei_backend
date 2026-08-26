import { LearningProgress } from '../models/LearningProgress.js';
import { LearningResource } from '../models/LearningResource.js';
import { Lesson } from '../models/Lesson.js';
import { awardXp } from '../services/reward.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

async function resourceForUser(resourceId) {
  const resource = await LearningResource.findById(resourceId);
  if (!resource || !resource.lessonId) throw new HttpError(404, 'Learning resource not found.');
  const lesson = await Lesson.findById(resource.lessonId);
  if (!lesson) throw new HttpError(404, 'Lesson not found.');
  return { resource, lesson };
}

export const listPathProgress = asyncHandler(async (req, res) => {
  const items = await LearningProgress.find({ userId: req.user.id, learningPathId: req.params.pathId });
  return ok(res, items);
});

export const startResource = asyncHandler(async (req, res) => {
  const { resource, lesson } = await resourceForUser(req.params.resourceId);
  const item = await LearningProgress.findOneAndUpdate(
    { userId: req.user.id, resourceId: resource.id },
    { $set: { learningPathId: req.body?.learningPathId, lessonId: lesson.id, lastOpenedAt: new Date() }, $setOnInsert: { startedAt: new Date(), status: 'in_progress' } },
    { upsert: true, new: true, runValidators: true },
  );
  return ok(res, item);
});

export const completeResource = asyncHandler(async (req, res) => {
  const { resource, lesson } = await resourceForUser(req.params.resourceId);
  const existing = await LearningProgress.findOne({ userId: req.user.id, resourceId: resource.id });
  const item = await LearningProgress.findOneAndUpdate(
    { userId: req.user.id, resourceId: resource.id },
    { $set: { learningPathId: req.body?.learningPathId, lessonId: lesson.id, status: 'completed', completedAt: new Date(), lastOpenedAt: new Date() }, $setOnInsert: { startedAt: new Date() } },
    { upsert: true, new: true, runValidators: true },
  );
  if (!existing || existing.status !== 'completed') await awardXp(req.user, 5);
  return ok(res, item);
});
