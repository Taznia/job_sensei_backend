import { z } from 'zod';

import { Community } from '../models/Community.js';
import { awardXp } from '../services/reward.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const createCommunitySchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(45),
    description: z.string().trim().min(8).max(400),
    category: z.string().min(1),
    privacy: z.enum(['public', 'private']).optional(),
    visualKey: z.string().min(1),
  }),
});

function serializeCommunity(community, userId) {
  const members = community.members || [];
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    category: community.category,
    visualKey: community.visualKey,
    memberCount: members.length,
    privacy: community.privacy,
    createdById: community.createdById?.toString?.() || community.createdById,
    createdAt: community.createdAt,
    isJoined: userId
      ? members.some((id) => id.toString() === userId)
      : false,
  };
}

export const listCommunities = asyncHandler(async (req, res) => {
  const items = await Community.find().sort({ createdAt: -1 });
  return ok(res, items.map((item) => serializeCommunity(item, req.user?.id)));
});

export const getCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community) throw new HttpError(404, 'Community not found.');
  return ok(res, serializeCommunity(community, req.user?.id));
});

export const createCommunity = asyncHandler(async (req, res) => {
  const community = await Community.create({
    ...req.validated.body,
    privacy: req.validated.body.privacy || 'public',
    createdById: req.user.id,
    members: [req.user.id],
  });
  await awardXp(req.user, 10);
  return created(res, serializeCommunity(community, req.user.id));
});

export const joinCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community) throw new HttpError(404, 'Community not found.');
  const already = community.members.some((id) => id.toString() === req.user.id);
  if (!already) {
    community.members.push(req.user.id);
    await community.save();
    await awardXp(req.user, 5);
  }
  return ok(res, serializeCommunity(community, req.user.id));
});

export const leaveCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community) throw new HttpError(404, 'Community not found.');
  community.members = community.members.filter(
    (id) => id.toString() !== req.user.id,
  );
  await community.save();
  return ok(res, serializeCommunity(community, req.user.id));
});
