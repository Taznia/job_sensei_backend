import { z } from 'zod';

import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { createOtp, hashOtp } from '../utils/otp.js';
import { signToken } from '../utils/token.js';

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    role: z.enum(['seeker', 'recruiter']).optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const emailSchema = z.object({
  body: z.object({ email: z.string().email() }),
});

const otpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  }),
});

const resetSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    password: z.string().min(8).max(72),
  }),
});

const passwordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72),
  }),
});

function authPayload(user) {
  return { token: signToken(user), user: user.toPublic() };
}

async function findByEmail(email) {
  return User.findOne({ email: email.toLowerCase() });
}

export const authValidators = {
  registerSchema,
  loginSchema,
  emailSchema,
  otpSchema,
  resetSchema,
  passwordSchema,
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.validated.body;
  const existing = await findByEmail(email);
  if (existing) throw new HttpError(409, 'An account with that email already exists.');

  const user = await User.create({
    name,
    email,
    passwordHash: await User.hashPassword(password),
    role: role || 'seeker',
    headline: role === 'recruiter' ? 'Recruiter' : 'Job Sensei member',
  });

  return created(res, authPayload(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await findByEmail(email);
  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, 'Invalid email or password.');
  }
  if (user.isBanned) throw new HttpError(403, 'This account is suspended.');
  return ok(res, authPayload(user));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await findByEmail(req.validated.body.email);
  if (user) {
    const otp = createOtp();
    user.otpHash = hashOtp(otp);
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    if (env.isDev) {
      return ok(res, {
        message: 'OTP generated. Check the development response.',
        otp,
      });
    }
  }
  return ok(res, { message: 'If that email exists, a reset code was sent.' });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  await requireValidOtp(req.validated.body.email, req.validated.body.otp);
  return ok(res, { valid: true });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.validated.body;
  const user = await requireValidOtp(email, otp);
  user.passwordHash = await User.hashPassword(password);
  user.otpHash = undefined;
  user.otpExpires = undefined;
  await user.save();
  return ok(res, { message: 'Password updated. You can sign in now.' });
});

export const me = asyncHandler(async (req, res) => {
  return ok(res, req.user.toPublic());
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.validated.body;
  if (!(await req.user.comparePassword(currentPassword))) {
    throw new HttpError(400, 'Current password is incorrect.');
  }
  req.user.passwordHash = await User.hashPassword(newPassword);
  await req.user.save();
  return ok(res, { message: 'Password updated.' });
});

async function requireValidOtp(email, otp) {
  const user = await findByEmail(email);
  if (!user || !user.otpHash || !user.otpExpires) {
    throw new HttpError(400, 'Invalid or expired code.');
  }
  if (user.otpExpires.getTime() < Date.now()) {
    throw new HttpError(400, 'That code has expired.');
  }
  if (user.otpHash !== hashOtp(otp)) {
    throw new HttpError(400, 'Invalid or expired code.');
  }
  return user;
}
