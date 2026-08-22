import { Notification } from '../models/Notification.js';

export async function notify({ userId, type, title, body, data = {} }) {
  if (!userId) return null;
  return Notification.create({ userId, type, title, body, data });
}
