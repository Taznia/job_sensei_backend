import { Router } from 'express';

import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import * as admin from '../controllers/admin.controller.js';
import * as applications from '../controllers/applications.controller.js';
import * as auth from '../controllers/auth.controller.js';
import * as communities from '../controllers/communities.controller.js';
import * as files from '../controllers/files.controller.js';
import * as jobs from '../controllers/jobs.controller.js';
import * as learning from '../controllers/learning.controller.js';
import * as notifications from '../controllers/notifications.controller.js';
import * as posts from '../controllers/posts.controller.js';
import * as resumes from '../controllers/resumes.controller.js';
import * as rewards from '../controllers/rewards.controller.js';
import * as users from '../controllers/users.controller.js';

export const api = Router();

api.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'jobsensei-api' } });
});
api.get('/files/:id', files.getFile);

api.post('/auth/register', validate(auth.authValidators.registerSchema), auth.register);
api.post('/auth/login', validate(auth.authValidators.loginSchema), auth.login);
api.post('/auth/forgot-password', validate(auth.authValidators.emailSchema), auth.forgotPassword);
api.post('/auth/verify-otp', validate(auth.authValidators.otpSchema), auth.verifyOtp);
api.post('/auth/reset-password', validate(auth.authValidators.resetSchema), auth.resetPassword);
api.get('/auth/me', requireAuth, auth.me);
api.patch(
  '/auth/password',
  requireAuth,
  validate(auth.authValidators.passwordSchema),
  auth.changePassword,
);

api.get('/users/me', requireAuth, users.getMe);
api.patch('/users/me', requireAuth, validate(users.updateMeSchema), users.updateMe);
api.get('/users/:id', users.getUser);

api.get('/jobs', optionalAuth, jobs.listJobs);
api.get('/jobs/recommended', requireAuth, jobs.recommendedJobs);
api.get('/jobs/saved', requireAuth, jobs.savedJobs);
api.get('/jobs/:id', optionalAuth, jobs.getJob);
api.post('/jobs/:id/save', requireAuth, jobs.saveJob);
api.delete('/jobs/:id/save', requireAuth, jobs.unsaveJob);
api.post(
  '/jobs',
  requireAuth,
  requireRole('recruiter', 'admin'),
  validate(jobs.createJobSchema),
  jobs.createJob,
);
api.patch(
  '/jobs/:id',
  requireAuth,
  requireRole('recruiter', 'admin'),
  validate(jobs.updateJobSchema),
  jobs.updateJob,
);
api.delete('/jobs/:id', requireAuth, requireRole('recruiter', 'admin'), jobs.deleteJob);

api.get('/applications', requireAuth, applications.listApplications);
api.post(
  '/applications',
  requireAuth,
  validate(applications.createApplicationSchema),
  applications.createApplication,
);
api.get('/applications/:id', requireAuth, applications.getApplication);
api.patch(
  '/applications/:id',
  requireAuth,
  validate(applications.updateApplicationSchema),
  applications.updateApplication,
);

api.get('/resumes', requireAuth, resumes.listResumes);
api.post('/resumes', requireAuth, upload.single('file'), resumes.createResume);
api.get('/resumes/:id', requireAuth, resumes.getResume);
api.patch('/resumes/:id', requireAuth, upload.single('file'), resumes.updateResume);
api.delete('/resumes/:id', requireAuth, resumes.deleteResume);
api.post('/resumes/:id/default', requireAuth, resumes.setDefaultResume);

api.get('/communities', optionalAuth, communities.listCommunities);
api.post(
  '/communities',
  requireAuth,
  validate(communities.createCommunitySchema),
  communities.createCommunity,
);
api.get('/communities/:id', optionalAuth, communities.getCommunity);
api.post('/communities/:id/join', requireAuth, communities.joinCommunity);
api.delete('/communities/:id/leave', requireAuth, communities.leaveCommunity);

api.get('/posts', optionalAuth, posts.listPosts);
api.post('/posts', requireAuth, upload.array('files', 5), posts.createPost);
api.get('/posts/:id', optionalAuth, posts.getPost);
api.post('/posts/:id/like', requireAuth, posts.toggleLike);
api.post('/posts/:id/follow', requireAuth, posts.toggleFollow);
api.post(
  '/posts/:id/comments',
  requireAuth,
  validate(posts.commentSchema),
  posts.addComment,
);
api.delete('/posts/:id', requireAuth, posts.deletePost);

api.get('/learning/skill-gaps', optionalAuth, learning.skillGaps);
api.put(
  '/learning/skills',
  requireAuth,
  validate(learning.updateSkillsSchema),
  learning.updateSkills,
);
api.get('/learning/resources', learning.listResources);
api.get('/learning/bookmarks', requireAuth, learning.listBookmarks);
api.post(
  '/learning/bookmarks',
  requireAuth,
  validate(learning.bookmarkSchema),
  learning.addBookmark,
);
api.delete('/learning/bookmarks/:id', requireAuth, learning.removeBookmark);

api.get('/notifications', requireAuth, notifications.listNotifications);
api.patch('/notifications/:id/read', requireAuth, notifications.markRead);
api.patch('/notifications/read-all', requireAuth, notifications.markAllRead);

api.get('/rewards/me', requireAuth, rewards.myRewards);

api.get('/admin/stats', requireAuth, requireRole('admin'), admin.stats);
api.get('/admin/users', requireAuth, requireRole('admin'), admin.listUsers);
api.patch(
  '/admin/users/:id',
  requireAuth,
  requireRole('admin'),
  validate(admin.updateUserSchema),
  admin.updateUser,
);
api.delete('/admin/posts/:id', requireAuth, requireRole('admin'), admin.deletePost);
