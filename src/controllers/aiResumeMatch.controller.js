import { z } from 'zod';

import { AiResumeMatch } from '../models/AiResumeMatch.js';
import { Resume } from '../models/Resume.js';
import { analyseResumeMatch, resumeToText } from '../services/aiResumeMatch.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

/**
 * AI Resume Match.
 *
 * Scores one of the caller's resumes against a pasted job description and
 * stores the result as history. Always scoped to the signed-in user, so no
 * userId appears in any path.
 */

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const HISTORY_LIMIT = 30;

export const analyseSchema = z.object({
  body: z.object({
    resumeId: objectId,
    // Long enough to actually be a job description rather than a stray word.
    jobDescription: z.string().trim().min(20, 'Paste a longer job description.').max(20000),
  }),
});

export const historySchema = z.object({
  query: z.object({
    resumeId: objectId.optional(),
    limit: z.coerce.number().int().min(1).max(HISTORY_LIMIT).default(HISTORY_LIMIT),
  }),
});

function serialize(match) {
  const json = match.toObject();
  json.id = match.id;
  delete json._id;
  delete json.__v;
  delete json.userId;
  return json;
}

/** POST /api/ai/resume-match */
export const analyse = asyncHandler(async (req, res) => {
  const { resumeId, jobDescription } = req.validated.body;

  const resume = await Resume.findOne({ _id: resumeId, userId: req.user.id });
  if (!resume) throw new HttpError(404, 'Resume not found.');

  const resumeText = resumeToText(resume);
  if (!resumeText.trim()) {
    throw new HttpError(400, 'This resume is empty. Add some details first.');
  }

  const analysis = await analyseResumeMatch({ resumeText, jobDescription });

  const saved = await AiResumeMatch.create({
    userId: req.user.id,
    resumeId: resume._id,
    resumeTitle: resume.title,
    jobDescription,
    ...analysis,
  });

  return created(res, serialize(saved));
});

/** GET /api/ai/resume-match/history */
export const history = asyncHandler(async (req, res) => {
  const { resumeId, limit } = req.validated.query;

  const filter = { userId: req.user.id };
  if (resumeId) filter.resumeId = resumeId;

  const items = await AiResumeMatch.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);

  return ok(res, items.map(serialize));
});

/** GET /api/ai/resume-match/:id */
export const getOne = asyncHandler(async (req, res) => {
  const match = await AiResumeMatch.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (!match) throw new HttpError(404, 'Analysis not found.');
  return ok(res, serialize(match));
});

/** DELETE /api/ai/resume-match/:id */
export const remove = asyncHandler(async (req, res) => {
  const result = await AiResumeMatch.deleteOne({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (result.deletedCount === 0) throw new HttpError(404, 'Analysis not found.');
  return ok(res, { id: req.params.id });
});
