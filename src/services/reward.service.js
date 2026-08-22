const BADGE_THRESHOLDS = [
  { xp: 20, badge: 'First steps' },
  { xp: 50, badge: 'Active member' },
  { xp: 100, badge: 'Career builder' },
];

export async function awardXp(user, amount) {
  if (!user) return user;
  user.xp = (user.xp || 0) + amount;
  for (const item of BADGE_THRESHOLDS) {
    if (user.xp >= item.xp && !user.badges.includes(item.badge)) {
      user.badges.push(item.badge);
    }
  }
  await user.save();
  return user;
}
