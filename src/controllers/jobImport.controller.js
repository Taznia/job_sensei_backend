import { z } from 'zod';

import {
  IMPORT_SOURCES,
  importJobs,
  importStatus,
} from '../services/jobImport.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

/**
 * Job import endpoints — Module 2 (Adreed Saadad Hasan, 22301190).
 *
 * Open to any signed-in user: asking for fresher listings is a seeker's most
 * natural request, and they want it most. What needs limiting is how often we
 * call the public boards, not who may ask — so the service applies a global
 * cooldown and reports "already up to date" inside it.
 *
 * Only recruiters and admins may bypass that cooldown.
 */

export const runImportSchema = z.object({
  body: z.object({
    sources: z
      .array(z.enum(IMPORT_SOURCES))
      .nonempty()
      .optional()
      .default([...IMPORT_SOURCES]),
    limit: z.coerce.number().int().min(1).max(100).optional().default(40),
    // Bypasses the cooldown. Honoured only for recruiters and admins, so a
    // seeker cannot turn a bounded refresh into unbounded outbound traffic.
    force: z.boolean().optional().default(false),
  }),
});

/** POST /api/jobs/import */
export const runImport = asyncHandler(async (req, res) => {
  const { sources, limit, force } = req.validated.body;

  // Only staff may bypass the cooldown, so a seeker cannot turn a bounded
  // refresh into unbounded outbound traffic to the job boards.
  const isStaff = req.user.role === 'recruiter' || req.user.role === 'admin';
  const result = await importJobs({ sources, limit, force: force && isStaff });

  // A board being unreachable is reported, not thrown: the other source may
  // well have succeeded, and the caller needs to see which did what.
  const anyFailed = result.sources.some((s) => !s.ok);
  return ok(res, { ...result, partial: anyFailed });
});

/** GET /api/jobs/import/status */
export const getImportStatus = asyncHandler(async (req, res) => {
  return ok(res, await importStatus());
});
