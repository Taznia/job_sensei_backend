import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';

function serialize(item) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    data: item.data,
    read: item.read,
    createdAt: item.createdAt,
  };
}

export const listNotifications = asyncHandler(async (req, res) => {
  const items = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100);
  return ok(res, items.map(serialize));
});

export const markRead = asyncHandler(async (req, res) => {
  const item = await Notification.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (!item) throw new HttpError(404, 'Notification not found.');
  item.read = true;
  await item.save();
  return ok(res, serialize(item));
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
  return ok(res, { updated: true });
});
