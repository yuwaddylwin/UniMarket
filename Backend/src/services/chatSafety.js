import mongoose from 'mongoose';
import User from '../models/user.model.js';

export const pairFilter = (me, other) => ({ $or: [
  { senderId: me, receivedId: other }, { senderId: other, receivedId: me },
] });
export const conversationId = (a, b) => [String(a), String(b)].sort().join(':');
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export async function validatePartner(me, other) {
  if (!mongoose.isObjectIdOrHexString(other)) fail(400, 'Invalid user ID');
  if (String(me) === String(other)) fail(400, 'Choose another user');
  const user = await User.findById(other).select('fullName username email profilePic blockedUsers');
  if (!user) fail(404, 'User not found');
  return user;
}
// Writing both participant documents makes concurrent sends, blocks and deletes
// conflict and retry against fresh state, including across server processes.
export async function withChatTransaction(me, other, action) {
  await validatePartner(me, other);
  return mongoose.connection.transaction(async session => {
    const users = [];
    for (const id of [String(me), String(other)].sort()) {
      const user = await User.findOneAndUpdate({ _id: id }, { $inc: { chatRevision: 1 } }, { new: true, session });
      if (!user) fail(404, 'User not found');
      users.push(user);
    }
    return action(session, users.find(u => String(u._id) === String(me)), users.find(u => String(u._id) === String(other)));
  });
}
export const hasBlocked = (user, otherId) => Array.isArray(user?.blockedUsers)
  && user.blockedUsers.some(id => mongoose.isObjectIdOrHexString(id)
    && String(id).toLowerCase() === String(otherId).toLowerCase());
export const blockState = (me, other) => ({
  blockedByMe: hasBlocked(me, other._id),
  messagingBlocked: hasBlocked(me, other._id) || hasBlocked(other, me._id),
});
export const isBlocked = (a, b) => blockState(a, b).messagingBlocked;
export function chatError(res, error) {
  if (!error.status) console.error('Chat operation failed:', error);
  return res.status(error.status || 500).json({ message: error.status ? error.message : 'Something went wrong. Please try again.' });
}
