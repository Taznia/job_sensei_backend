import { z } from 'zod';

import { persistUploads } from '../middleware/upload.js';
import { Community } from '../models/Community.js';
import { Post } from '../models/Post.js';
import { Report } from '../models/Report.js';
import { notify } from '../services/notification.service.js';
import { awardXp } from '../services/reward.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

export const createPostSchema = z.object({
  body: z.object({
    body: z.string().trim().min(8).max(4000),
    type: z.string().min(1),
    communityId: z.string().optional(),
    communityName: z.string().optional(),
  }),
});

export const commentSchema = z.object({
  body: z.object({
    body: z.string().trim().min(1).max(1000),
    parentCommentId: z.string().optional(),
  }),
});

export const reportSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(5).max(1000),
  }),
});

function serializePost(post, userId) {
  const likes = post.likes || [];
  const followers = post.followers || [];
  return {
    id: post.id,
    authorId: post.authorId?.toString?.() || post.authorId,
    author: post.author,
    role: post.role,
    body: post.body,
    createdAt: post.createdAt,
    tags: post.tags,
    communityId: post.communityId?.toString?.() || post.communityId,
    attachments: (post.attachments || []).map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      sizeBytes: item.sizeBytes,
      url: item.url,
    })),
    comments: (post.comments || []).map((item) => ({
      id: item.id,
      authorId: item.authorId?.toString?.() || item.authorId,
      author: item.author,
      body: item.body,
      parentCommentId: item.parentCommentId?.toString?.() || null,
      createdAt: item.createdAt,
    })),
    likeCount: likes.length,
    commentCount: (post.comments || []).length,
    isLiked: userId ? likes.some((id) => id.toString() === userId) : false,
    isFollowed: userId
      ? followers.some((id) => id.toString() === userId)
      : false,
  };
}

export const listPosts = asyncHandler(async (req, res) => {
  const { communityId, tag, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (communityId) filter.communityId = communityId;
  if (tag) filter.tags = tag;
  const skip = (Number(page) - 1) * Number(limit);
  const items = await Post.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));
  return ok(res, items.map((item) => serializePost(item, req.user?.id)));
});

export const getPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new HttpError(404, 'Post not found.');
  return ok(res, serializePost(post, req.user?.id));
});

export const createPost = asyncHandler(async (req, res) => {
  const { body, type, communityId, communityName } = req.body;
  if (!body || String(body).trim().length < 8) {
    throw new HttpError(400, 'Write a bit more before publishing.');
  }

  if (communityId) {
    const community = await Community.findById(communityId);
    if (!community) throw new HttpError(404, 'Community not found.');
    const isMember = community.members.some((id) => id.toString() === req.user.id);
    if (!isMember) throw new HttpError(403, 'Join the community before posting.');
  }

  const attachments = await persistUploads(req, req.files || []);

  const post = await Post.create({
    authorId: req.user.id,
    author: req.user.name,
    role: req.user.headline || 'Job Sensei member',
    body: String(body).trim(),
    tags: [type, communityName].filter(Boolean),
    communityId: communityId || undefined,
    attachments,
  });
  await awardXp(req.user, 10);
  return created(res, serializePost(post, req.user.id));
});

export const toggleLike = asyncHandler(async (req, res) => {
  const post = await loadPost(req.params.id);
  const index = post.likes.findIndex((id) => id.toString() === req.user.id);
  if (index >= 0) {
    post.likes.splice(index, 1);
  } else {
    post.likes.push(req.user.id);
    if (post.authorId.toString() !== req.user.id) {
      await notify({
        userId: post.authorId,
        type: 'like',
        title: 'New like',
        body: `${req.user.name} liked your post.`,
        data: { postId: post.id },
      });
    }
  }
  await post.save();
  return ok(res, serializePost(post, req.user.id));
});

export const toggleFollow = asyncHandler(async (req, res) => {
  const post = await loadPost(req.params.id);
  const index = post.followers.findIndex((id) => id.toString() === req.user.id);
  if (index >= 0) post.followers.splice(index, 1);
  else post.followers.push(req.user.id);
  await post.save();
  return ok(res, serializePost(post, req.user.id));
});

export const addComment = asyncHandler(async (req, res) => {
  const post = await loadPost(req.params.id);
  const { body, parentCommentId } = req.validated.body;
  if (
    parentCommentId &&
    !post.comments.some((comment) => comment.id === parentCommentId)
  ) {
    throw new HttpError(404, 'Parent comment not found.');
  }
  post.comments.push({
    authorId: req.user.id,
    author: req.user.name,
    body,
    parentCommentId: parentCommentId || undefined,
  });
  await post.save();
  if (post.authorId.toString() !== req.user.id) {
    await notify({
      userId: post.authorId,
      type: 'comment',
      title: 'New comment',
      body: `${req.user.name} commented on your post.`,
      data: { postId: post.id },
    });
  }
  return ok(res, serializePost(post, req.user.id));
});

export const reportPost = asyncHandler(async (req, res) => {
  const post = await loadPost(req.params.id);
  try {
    const report = await Report.create({
      reportedBy: req.user.id,
      targetType: 'post',
      targetId: post.id,
      reason: req.validated.body.reason,
    });
    return created(res, { id: report.id, status: report.status });
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, 'You already reported this post.');
    }
    throw error;
  }
});
export const deletePost = asyncHandler(async (req, res) => {
  const post = await loadPost(req.params.id);
  let isCommunityCreator = false;
  if (post.communityId) {
    const community = await Community.findById(post.communityId).select(
      'createdById',
    );
    isCommunityCreator =
      community?.createdById?.toString() === req.user.id;
  }
  const isAuthor = post.authorId.toString() === req.user.id;
  if (!isAuthor && !isCommunityCreator && req.user.role !== 'admin') {
    throw new HttpError(403, 'You cannot delete this post.');
  }
  await post.deleteOne();
  return ok(res, { deleted: true });
});

async function loadPost(id) {
  const post = await Post.findById(id);
  if (!post) throw new HttpError(404, 'Post not found.');
  return post;
}
