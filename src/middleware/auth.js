import { User } from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { verifyToken } from '../utils/token.js';

export async function optionalAuth(req, res, next) {
  try {
    req.user = await loadUser(req);
  } catch {
    req.user = null;
  }
  next();
}

export async function requireAuth(req, res, next) {
  try {
    const user = await loadUser(req);
    if (!user) throw new HttpError(401, 'Sign in to continue.');
    if (user.isBanned) throw new HttpError(403, 'This account is suspended.');
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new HttpError(403, 'You do not have permission to do that.'));
      return;
    }
    next();
  };
}

async function loadUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  const user = await User.findById(payload.sub);
  return user;
}
