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
    visualKey: z.string().min(1),
  }),
});

function serializeCommunity(community, userId) {
  const members = community.members || [];
  const creatorId =
    community.createdById?.toString?.() || community.createdById;
  const isOwner = Boolean(userId && creatorId === userId);
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    category: community.category,
    visualKey: community.visualKey,
    memberCount: members.length,
    privacy: 'public',
    createdById: creatorId,
    createdAt: community.createdAt,
    isJoined: userId
      ? members.some((member) =>
          (member.id || member._id || member).toString() === userId,
        )
      : false,
    isOwner,
    members: isOwner
      ? members.map((member) => ({
          id: (member.id || member._id || member).toString(),
          name: member.name || 'Community member',
          email: member.email || '',
          role: member.role || 'seeker',
        }))
      : [],
  };
}

export const listCommunities = asyncHandler(async (req, res) => {
  const items = await Community.find()
    .populate('members', 'name email role')
    .sort({ createdAt: -1 });
  return ok(res, items.map((item) => serializeCommunity(item, req.user?.id)));
});

export const getCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id).populate(
    'members',
    'name email role',
  );
  if (!community) throw new HttpError(404, 'Community not found.');
  return ok(res, serializeCommunity(community, req.user?.id));
});

export const createCommunity = asyncHandler(async (req, res) => {
  const community = await Community.create({
    ...req.validated.body,
    privacy: 'public',
    createdById: req.user.id,
    members: [req.user.id],
  });
  await community.populate('members', 'name email role');
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
  await community.populate('members', 'name email role');
  return ok(res, serializeCommunity(community, req.user.id));
});

export const leaveCommunity = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community) throw new HttpError(404, 'Community not found.');
  if (community.createdById.toString() === req.user.id) {
    throw new HttpError(
      400,
      'The community creator cannot leave their own community.',
    );
  }
  community.members = community.members.filter(
    (id) => id.toString() !== req.user.id,
  );
  await community.save();
  await community.populate('members', 'name email role');
  return ok(res, serializeCommunity(community, req.user.id));
});

export const removeMember = asyncHandler(async (req, res) => {
  const community = await Community.findById(req.params.id);
  if (!community) throw new HttpError(404, 'Community not found.');

  const isCreator = community.createdById.toString() === req.user.id;
  if (!isCreator && req.user.role !== 'admin') {
    throw new HttpError(
      403,
      'Only the community creator can remove members.',
    );
  }

  const memberId = req.params.userId;
  if (community.createdById.toString() === memberId) {
    throw new HttpError(400, 'The community creator cannot be removed.');
  }
  const wasMember = community.members.some(
    (id) => id.toString() === memberId,
  );
  if (!wasMember) throw new HttpError(404, 'Community member not found.');

  community.members = community.members.filter(
    (id) => id.toString() !== memberId,
  );
  await community.save();
  await community.populate('members', 'name email role');
  return ok(res, serializeCommunity(community, req.user.id));
});
