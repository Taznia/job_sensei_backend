import { z } from 'zod';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const chatSchema = z.object({
  body: z.object({
    message: z.string().trim().max(6000).default(''),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          text: z.string().max(6000),
        }),
      )
      .max(20)
      .default([]),
    attachments: z
      .array(
        z.object({
          name: z.string().max(255),
          mimeType: z.string().max(100),
        }),
      )
      .max(3)
      .default([]),
  }),
});

/// Privacy-safe API boundary for Module 1. The endpoint currently returns the
/// local coach response and does not forward chat or files to a third party.
export const chat = asyncHandler(async (req, res) => {
  const { message, attachments } = req.validated.body;
  if (!message && attachments.length === 0) {
    throw new HttpError(400, 'Write a message or attach a file.');
  }
  return ok(res, {
    reply: careerReply(message, attachments),
    provider: 'offline',
  });
});

function careerReply(message, attachments) {
  const normalized = message.toLowerCase();
  if (attachments.length) {
    return `I received ${attachments.map((item) => item.name).join(', ')}, but file content is not sent outside Job Sensei. Tell me whether you want help with impact, clarity, or interview fit.`;
  }
  if (normalized.includes('interview')) {
    return 'Study the role, prepare five STAR stories, and practice a one-minute introduction. I can create questions for your target role.';
  }
  if (normalized.includes('skill') || normalized.includes('learn')) {
    return 'Open a job, review its high-priority skill gaps, and start one recommended learning path. Complete a small project before moving to the next gap.';
  }
  if (normalized.includes('resume') || normalized.includes('cv')) {
    return 'Use action verbs, include measurable outcomes, and tailor the first half of the resume to the target job. Review every AI suggestion before saving it.';
  }
  return 'I can help with job matching, skill gaps, learning plans, resumes, and interviews.';
}
