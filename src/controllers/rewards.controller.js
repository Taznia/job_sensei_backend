import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';

export const myRewards = asyncHandler(async (req, res) => {
  return ok(res, {
    xp: req.user.xp,
    badges: req.user.badges,
  });
});
