import webpush from 'web-push';
import { ChatAlert, PushSubscription, PushDelivery } from '../models/chatAlert.model.js';
import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import { io, getReceiverSocketId } from '../lib/socket.js';
export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
export async function addChatAlert(data, session) {
  const [notification] = await ChatAlert.create([data], { session });
  return notification;
}
export async function isChatPageActive(userId) {
  const sockets = await io.in(getReceiverSocketId(userId)).fetchSockets();
  return sockets.some(socket => socket.data.chatActiveUntil > Date.now());
}
// Durable notification records are the outbox. A unique per-device delivery key
// allows concurrent dispatchers to resume safely after a process restart.
export async function dispatchChatAlerts() {
  const pending = await ChatAlert.find({ kind: 'message', dispatchedAt: null }).sort({ createdAt: 1 }).limit(50);
  for (const note of pending) {
    const user = await User.findById(note.userId).select('preferences');
    if (pushConfigured() && user?.preferences?.browserPush && (note.kind !== 'message' || user.preferences.messages !== false) && !note.readAt) {
      const subscriptions = await PushSubscription.find({ userId: note.userId }).select('_id');
      for (const sub of subscriptions) {
        await PushDelivery.updateOne({ notificationId: note._id, subscriptionId: sub._id }, { $setOnInsert: { expiresAt: new Date(Date.now() + 86400000) } }, { upsert: true });
      }
    }
    await ChatAlert.updateOne({ _id: note._id }, { $set: { dispatchedAt: new Date() } });
  }
}
export async function deliverPush(send = webpush.sendNotification.bind(webpush)) {
  if (!pushConfigured()) return;
  const delivery = await PushDelivery.findOneAndUpdate({ $or: [
    { status: 'pending', nextAttemptAt: { $lte: new Date() } },
    { status: 'sending', leaseUntil: { $lte: new Date() } },
  ] }, { $set: { status: 'sending', leaseUntil: new Date(Date.now() + 60000) }, $inc: { attempts: 1 } }, { new: true, sort: { createdAt: 1 } });
  if (!delivery) return false;
  const finish = status => PushDelivery.updateOne({ _id: delivery._id, attempts: delivery.attempts }, { $set: { status } });
  try {
    const note = await ChatAlert.findById(delivery.notificationId);
    const sub = await PushSubscription.findById(delivery.subscriptionId).select('+endpoint +keys.p256dh +keys.auth');
    const user = note && await User.findById(note.userId).select('preferences');
    if (!note || note.kind !== 'message' || !sub || !user || String(sub.userId) !== String(note.userId) || note.readAt || delivery.expiresAt <= new Date() || !user.preferences.browserPush || (note.kind === 'message' && user.preferences.messages === false)) { await finish('skipped'); return true; }
    if (note.kind === 'message' && (!await Message.exists({ _id: note.messageId, seen: { $ne: true } }) || await isChatPageActive(note.userId))) { await finish('skipped'); return true; }
    await send({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, JSON.stringify({ id: String(note._id), userId: String(note.userId), title: note.title, body: 'Open UniMarket to read your message.', url: note.url }), {
      TTL: 86400, timeout: 10000,
      vapidDetails: { subject: process.env.VAPID_SUBJECT, publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY },
    });
    await finish('sent');
  } catch (error) {
    if ([404, 410].includes(error.statusCode)) {
      await PushSubscription.deleteOne({ _id: delivery.subscriptionId }); await finish('skipped');
    } else if (delivery.attempts >= 5 || (error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429)) await finish('failed');
    else await PushDelivery.updateOne({ _id: delivery._id, attempts: delivery.attempts }, { $set: { status: 'pending', nextAttemptAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** delivery.attempts)) } });
  }
  return true;
}
export function startChatAlertWorker() {
  let busy = false;
  const tick = async () => {
    if (busy) return; busy = true;
    try { await dispatchChatAlerts(); for (let i = 0; i < 20; i++) if (!await deliverPush()) break; }
    catch (error) { console.error('ChatAlert worker will retry:', error.name); }
    finally { busy = false; }
  };
  const timer = setInterval(tick, 3000); timer.unref(); void tick();
  return () => clearInterval(timer);
}
