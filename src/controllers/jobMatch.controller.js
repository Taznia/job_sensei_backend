import { z } from 'zod';

import { Job } from '../models/Job.js';
import { scoreJobMatch } from '../services/jobMatch.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Job match score — Module 4 (Adreed Saadad Hasan, 22301190).
 *
 * Always scoped to the signed-in user, so there is no userId in the path: a
 * match score is a statement about one person against one job.
 */

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const matchJobSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({
    // Optional: without it the user's default resume is used, and failing that
    // the career profile alone.
    resumeId: objectId.optional(),
  }),
});

export const matchTopJobsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
    resumeId: objectId.optional(),
  }),
});

/** GET /api/jobs/:id/match */
export const matchJob = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { resumeId } = req.validated.query;

  const job = await Job.findById(id).lean();
  if (!job) throw new HttpError(404, 'Job not found.');

  const result = await scoreJobMatch({ job, userId: req.user.id, resumeId });

  // A missing profile is a 409, not a 500: the request was well formed, the
  // account just has nothing to match with yet.
  if (!result.scored) throw new HttpError(409, result.reason);

  return ok(res, result);
});

/**
 * GET /api/jobs/match/top
 *
 * Scores the newest open jobs and returns the best fits. Kept small and
 * explicitly capped, because each job is scored in process rather than in the
 * database.
 */
export const matchTopJobs = asyncHandler(async (req, res) => {
  const { limit, resumeId } = req.validated.query;

  // Scoring is O(candidates), so the candidate pool is bounded well above the
  // requested limit but far below the whole collection.
  const candidates = await Job.find({ status: 'open' })
    .sort({ postedAt: -1, createdAt: -1 })
    .limit(60)
    .lean();

  const scored = [];
  for (const job of candidates) {
    const result = await scoreJobMatch({
      job,
      userId: req.user.id,
      resumeId,
    });
    if (!result.scored) throw new HttpError(409, result.reason);
    scored.push({
      jobId: String(job._id),
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      overallScore: result.overallScore,
      verdict: result.verdict,
      verdictLabel: result.verdictLabel,
      matchedSkills: result.matchedSkills,
    });
  }

  scored.sort((a, b) => b.overallScore - a.overallScore);

  return ok(res, {
    considered: candidates.length,
    returned: Math.min(limit, scored.length),
    items: scored.slice(0, limit),
  });
});
