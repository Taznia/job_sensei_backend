import { z } from 'zod';

import { Job } from '../models/Job.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

/**
 * Job Search — Module 3 (Adreed Saadad Hasan, 22301190).
 *
 * The existing `GET /api/jobs` (jobs.controller.js) covers a basic listing with
 * q / location / type / workMode / skill. Module 3 also requires filtering by
 * company, salary range, and experience level, and it requires the most
 * relevant results first rather than merely the newest.
 *
 * Implemented as a separate endpoint rather than by rewriting `listJobs`, so
 * this feature's code stays reviewable on its own and the shared listing other
 * teammates' screens depend on keeps working unchanged.
 */

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const WORK_MODES = ['onsite', 'remote', 'hybrid'];
const EXPERIENCE_LEVELS = ['entry', 'junior', 'mid', 'senior', 'lead'];
const SORTS = ['relevance', 'newest', 'salary', 'title'];

const MAX_LIMIT = 50;

/** "React,Node" or repeated params both become a trimmed list. */
const csvList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined || value === '') return [];
    const raw = Array.isArray(value) ? value : value.split(',');
    return raw.map((v) => v.trim()).filter(Boolean);
  });

export const searchJobsSchema = z.object({
  query: z.object({
    q: z.string().trim().max(120).optional(),
    company: z.string().trim().max(120).optional(),
    location: z.string().trim().max(120).optional(),
    skill: csvList,
    type: z.enum(JOB_TYPES).optional(),
    workMode: z.enum(WORK_MODES).optional(),
    experienceLevel: z.enum(EXPERIENCE_LEVELS).optional(),
    salaryMin: z.coerce.number().min(0).optional(),
    salaryMax: z.coerce.number().min(0).optional(),
    remote: z.enum(['true', 'false']).optional(),
    sort: z.enum(SORTS).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(10),
  }),
});

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`);
}

/** Anchored, case-insensitive — so "react" matches a stored "React" exactly. */
function exactInsensitive(value) {
  return new RegExp(`^${escapeRegex(value)}$`, 'i');
}

/**
 * Builds the Mongo filter from validated query params.
 *
 * Salary is the subtle one. A job matches `salaryMin` when its *upper* bound
 * clears that floor, not its lower bound — otherwise a 60k-120k job would be
 * hidden from someone asking for 100k and up, even though it can pay it.
 */
function buildFilter(query) {
  const filter = { status: 'open' };

  if (query.q) filter.$text = { $search: query.q };
  if (query.company) {
    filter.company = { $regex: escapeRegex(query.company), $options: 'i' };
  }
  if (query.location) {
    filter.location = { $regex: escapeRegex(query.location), $options: 'i' };
  }
  if (query.skill.length) {
    filter.skills = { $in: query.skill.map(exactInsensitive) };
  }
  if (query.type) filter.type = query.type;
  if (query.experienceLevel) filter.experienceLevel = query.experienceLevel;

  // `remote=true` is the shorthand the job list's toggle sends; an explicit
  // workMode is more specific, so it wins when both arrive.
  if (query.workMode) {
    filter.workMode = query.workMode;
  } else if (query.remote === 'true') {
    filter.workMode = 'remote';
  } else if (query.remote === 'false') {
    filter.workMode = { $ne: 'remote' };
  }

  if (query.salaryMin !== undefined) {
    filter.salaryMax = { $gte: query.salaryMin };
  }
  if (query.salaryMax !== undefined) {
    filter.salaryMin = { $lte: query.salaryMax };
  }

  return filter;
}

/**
 * "Most relevant first" only means anything when the user typed something. With
 * filters alone every document scores the same, so newest-first is the honest
 * default rather than an arbitrary order dressed up as relevance.
 */
function buildSort(requested, hasTextSearch) {
  if (requested === 'newest') return { sort: { createdAt: -1 } };
  if (requested === 'title') return { sort: { title: 1 } };
  if (requested === 'salary') {
    return { sort: { salaryMax: -1, createdAt: -1 } };
  }
  if (hasTextSearch) {
    return {
      sort: { score: { $meta: 'textScore' }, createdAt: -1 },
      projection: { score: { $meta: 'textScore' } },
    };
  }
  return { sort: { createdAt: -1 } };
}

function serialize(job, savedIds) {
  const saved = savedIds.some((id) => String(id) === String(job._id));
  return {
    id: String(job._id),
    title: job.title,
    company: job.company,
    location: job.location,
    type: job.type,
    workMode: job.workMode,
    experienceLevel: job.experienceLevel,
    skills: job.skills,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    currency: job.currency,
    postedAt: job.createdAt,
    isSaved: saved,
    ...(job.score === undefined ? {} : { relevance: Number(job.score.toFixed(3)) }),
  };
}

/** GET /api/jobs/search */
export const searchJobs = asyncHandler(async (req, res) => {
  const query = req.validated.query;

  if (
    query.salaryMin !== undefined &&
    query.salaryMax !== undefined &&
    query.salaryMax < query.salaryMin
  ) {
    // Caught here rather than in the schema so the message can name both values.
    return res.status(400).json({
      success: false,
      error: {
        message: `salaryMax (${query.salaryMax}) cannot be lower than salaryMin (${query.salaryMin}).`,
      },
    });
  }

  const filter = buildFilter(query);
  const { sort, projection } = buildSort(query.sort, Boolean(filter.$text));

  const [jobs, total] = await Promise.all([
    Job.find(filter, projection)
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  // optionalAuth means req.user may be absent for a guest browsing jobs.
  const savedIds = req.user?.savedJobs || [];

  return ok(res, {
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(total / query.limit)),
    sort: query.sort || (filter.$text ? 'relevance' : 'newest'),
    appliedFilters: Object.keys(req.query).filter(
      (key) => !['page', 'limit', 'sort'].includes(key),
    ),
    items: jobs.map((job) => serialize(job, savedIds)),
  });
});

/** GET /api/jobs/search/filters */
export const getFilterOptions = asyncHandler(async (req, res) => {
  // Feeds the filter sheet, so it only ever offers values that match something.
  const [companies, locations, skills, salary] = await Promise.all([
    Job.distinct('company', { status: 'open' }),
    Job.distinct('location', { status: 'open' }),
    Job.distinct('skills', { status: 'open' }),
    Job.aggregate([
      { $match: { status: 'open', salaryMin: { $ne: null } } },
      {
        $group: {
          _id: null,
          min: { $min: '$salaryMin' },
          max: { $max: '$salaryMax' },
        },
      },
    ]),
  ]);

  const sorted = (list) =>
    list.filter(Boolean).sort((a, b) => a.localeCompare(b));

  return ok(res, {
    companies: sorted(companies),
    locations: sorted(locations),
    skills: sorted(skills),
    types: JOB_TYPES,
    workModes: WORK_MODES,
    experienceLevels: EXPERIENCE_LEVELS,
    sorts: SORTS,
    salaryRange: salary[0] ? { min: salary[0].min, max: salary[0].max } : null,
  });
});
