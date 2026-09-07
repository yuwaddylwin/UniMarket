import { fail } from './chatSafety.js';
export const publicUserFields = 'fullName username email profilePic verified role restriction warningCount createdAt';
export function accountStatus(user, now = Date.now()) {
  if (user?.restriction?.status === 'suspended') return 'suspended';
  if (user?.restriction?.status === 'frozen' && new Date(user.restriction.until).getTime() > now) return 'frozen';
  return user?.warningCount > 0 ? 'warned' : 'active';
}
export function assertActive(user) {
  const status = accountStatus(user);
  if (status === 'suspended') fail(403, 'Your account is suspended. Contact support if you need a review.');
  if (status === 'frozen') fail(403, `Account frozen until ${new Date(user.restriction.until).toISOString()}`);
}
export function requireActive(req, res, next) {
  try { assertActive(req.user); next(); } catch (error) { res.status(error.status).json({ message: error.message, accountStatus: accountStatus(req.user) }); }
}
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator access required' });
  return requireActive(req, res, next);
}
export const visibleListing = { moderationStatus: { $nin: ['hidden', 'removed', 'under_review'] } };
