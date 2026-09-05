import { z } from 'zod';

import { Application } from '../models/Application.js';
import { Job } from '../models/Job.js';
import { Resume } from '../models/Resume.js';
import { notify } from '../services/notification.service.js';
import { awardXp } from '../services/reward.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const createApplicationSchema = z.object({
  body: z.object({
    jobId: z.string().min(1),
    resumeId: z.string().optional(),
    coverLetter: z.string().max(5000).optional(),
  }),
});

/**
 * Application Tracker — an application the user made outside Job Sensei.
 *
 * These carry no jobId, so there is no recruiter on the other side: the user
 * owns the whole status timeline. That is why they get their own create and
 * status routes rather than reusing the job-board ones above, whose permission
 * rules (recruiter moves the status, applicant may only withdraw) do not apply.
 */
export const createTrackedApplicationSchema = z.object({
  body: z.object({
    jobTitle: z.string().trim().min(1, 'Job title is required.').max(200),
    companyName: z.string().trim().min(1, 'Company name is required.').max(200),
    resumeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }),
});

export const trackedStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'applied',
      'reviewing',
      'shortlisted',
      'interview',
      'offer',
      'rejected',
      'withdrawn',
    ]),
    interviewDate: z.coerce.date().optional(),
  }),
});

export const updateApplicationSchema = z.object({
  body: z.object({
    status: z.enum([
      'applied',
      'reviewing',
      'interview',
      'offer',
      'rejected',
      'withdrawn',
    ]),
  }),
});

function serialize(app) {
  const json = app.toObject();
  json.id = app.id;
  delete json._id;
  delete json.__v;
  return json;
}

export const listApplications = asyncHandler(async (req, res) => {
  let filter;
  if (req.user.role === 'recruiter') {
    const jobs = await Job.find({ recruiterId: req.user.id }).select('_id');
    filter = { jobId: { $in: jobs.map((job) => job._id) } };
  } else if (req.user.role === 'admin') {
    filter = {};
  } else {
    filter = { userId: req.user.id };
  }

  const items = await Application.find(filter)
    .populate('jobId')
    .populate('resumeId')
    .sort({ createdAt: -1 });
  return ok(res, items.map(serialize));
});

export const createApplication = asyncHandler(async (req, res) => {
  const { jobId, resumeId, coverLetter } = req.validated.body;
  const job = await Job.findById(jobId);
  if (!job || job.status !== 'open') throw new HttpError(404, 'Job not found.');

  if (resumeId) {
    const resume = await Resume.findOne({ _id: resumeId, userId: req.user.id });
    if (!resume) throw new HttpError(400, 'Resume not found.');
  }

  try {
    const application = await Application.create({
      jobId,
      userId: req.user.id,
      resumeId: resumeId || req.user.defaultResumeId,
      coverLetter: coverLetter || '',
    });
    await awardXp(req.user, 15);
    await notify({
      userId: job.recruiterId,
      type: 'application',
      title: 'New application',
      body: `${req.user.name} applied for ${job.title}.`,
      data: { applicationId: application.id, jobId: job.id },
    });
    return created(res, serialize(application));
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, 'You already applied to this job.');
    }
    throw error;
  }
});

/** POST /api/applications/tracked */
export const createTrackedApplication = asyncHandler(async (req, res) => {
  const { jobTitle, companyName, resumeId } = req.validated.body;

  let resume = null;
  if (resumeId) {
    resume = await Resume.findOne({ _id: resumeId, userId: req.user.id });
    if (!resume) throw new HttpError(400, 'Resume not found.');
  }

  const application = await Application.create({
    userId: req.user.id,
    resumeId: resume?._id,
    jobTitle,
    companyName,
    resumeTitle: resume?.title || '',
    targetField: resume?.targetField || '',
    status: 'applied',
    statusHistory: [{ status: 'applied', changedAt: new Date() }],
  });

  return created(res, serialize(application));
});

/** PATCH /api/applications/:id/tracked-status */
export const updateTrackedStatus = asyncHandler(async (req, res) => {
  const { status, interviewDate } = req.validated.body;

  const application = await Application.findById(req.params.id);
  if (!application) throw new HttpError(404, 'Application not found.');

  if (application.userId.toString() !== req.user.id) {
    throw new HttpError(403, 'You cannot update this application.');
  }
  if (application.jobId) {
    throw new HttpError(
      400,
      'This application came from a job posting. Use PATCH /applications/:id instead.',
    );
  }

  application.status = status;
  if (interviewDate) application.interviewDate = interviewDate;
  application.statusHistory.push({ status, changedAt: new Date() });
  await application.save();

  return ok(res, serialize(application));
});

/** DELETE /api/applications/:id/tracked */
export const deleteTrackedApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new HttpError(404, 'Application not found.');

  if (application.userId.toString() !== req.user.id) {
    throw new HttpError(403, 'You cannot delete this application.');
  }
  if (application.jobId) {
    throw new HttpError(400, 'Withdraw a job-board application instead of deleting it.');
  }

  await application.deleteOne();
  return ok(res, { deleted: true });
});

export const getApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('jobId')
    .populate('resumeId');
  if (!application) throw new HttpError(404, 'Application not found.');
  assertCanView(req.user, application);
  return ok(res, serialize(application));
});

export const updateApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate('jobId');
  if (!application) throw new HttpError(404, 'Application not found.');
  const status = req.validated.body.status;
  const job = application.jobId;

  const isOwner = application.userId.toString() === req.user.id;
  const isRecruiter =
    req.user.role === 'admin' ||
    (job && job.recruiterId.toString() === req.user.id);

  if (status === 'withdrawn') {
    if (!isOwner) throw new HttpError(403, 'Only the applicant can withdraw.');
  } else if (!isRecruiter) {
    throw new HttpError(403, 'You cannot update this application.');
  }

  application.status = status;
  await application.save();
  await notify({
    userId: application.userId,
    type: 'application_status',
    title: 'Application update',
    body: `Your application is now ${status}.`,
    data: { applicationId: application.id, status },
  });
  return ok(res, serialize(application));
});

function assertCanView(user, application) {
  const job = application.jobId;
  const isOwner = application.userId.toString() === user.id;
  const recruiterId = job?.recruiterId?.toString?.() || job?.recruiterId;
  if (user.role === 'admin' || isOwner || recruiterId === user.id) return;
  throw new HttpError(403, 'You cannot view this application.');
}
