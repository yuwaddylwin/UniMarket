import { createECDH } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import { io as client } from '../../frontend/node_modules/socket.io-client/build/esm-debug/index.js';
import User from '../src/models/user.model.js';
import Item from '../src/models/ItemsList.model.js';
import Accommodation from '../src/models/Accommodation.model.js';
import Message from '../src/models/message.model.js';
import Report from '../src/models/report.model.js';
import { Warning, Restriction, ModerationAction } from '../src/models/moderation.model.js';
import { ChatAlert, PushSubscription, PushDelivery } from '../src/models/chatAlert.model.js';
import { app, server } from '../src/lib/socket.js';
import adminRoutes from '../src/routes/admin.route.js';
import reportRoutes from '../src/routes/reports.route.js';
import messageRoutes from '../src/routes/message.route.js';
import authRoutes from '../src/routes/auth.route.js';
import itemRoutes from '../src/routes/Items.route.js';
import accommodationRoutes from '../src/routes/accommodations.route.js';
import { dispatchChatAlerts, deliverPush } from '../src/services/chatAlerts.js';
import { migrateReports, expireFreezes } from '../src/services/moderationMaintenance.js';
const uri = process.env.CHAT_TEST_MONGO_URL;
test('admin authorization, moderation, reports, notifications and push delivery', { skip: !uri, timeout: 120000 }, async t => {
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27029$/);
  process.env.JWT_SECRET = 'isolated-moderation-test-secret';
  const keys = webpush.generateVAPIDKeys(); Object.assign(process.env, { VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey, VAPID_SUBJECT: 'mailto:test@example.test' });
  const init = await mongoose.createConnection(`${uri}/admin?directConnection=true`).asPromise();
  try { await init.db.admin().command({ replSetInitiate: { _id: 'chatTest', members: [{ _id: 0, host: '127.0.0.1:27029' }] } }); } catch (error) { if (error.code !== 23) throw error; }
  await init.close(); await mongoose.connect(`${uri}/unimarket_moderation_tests?replicaSet=chatTest`);
  await mongoose.connection.dropDatabase();
  await Promise.all([User, Item, Accommodation, Message, Report, Warning, Restriction, ModerationAction, ChatAlert, PushSubscription, PushDelivery].map(Model => Model.init()));
  await migrateReports();
  app.use(express.json());
  for (const [path, routes] of [['admin', adminRoutes], ['reports', reportRoutes], ['messages', messageRoutes], ['auth', authRoutes], ['items', itemRoutes], ['accommodations', accommodationRoutes]]) app.use(`/api/${path}`, routes);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${server.address().port}`;
  const users = await User.create(['Admin', 'Alice', 'Bob', 'Carol'].map((name, i) => ({ fullName: name, email: `${name}@example.test`, password: 'test-password', verified: true, role: i ? 'user' : 'admin', preferences: { browserPush: true } })));
  const [admin, a, b, c] = users.map(u => String(u._id));
  const tokens = Object.fromEntries(users.map(u => [String(u._id), jwt.sign({ userId: u._id }, process.env.JWT_SECRET)]));
  const request = async (who, method, path, body) => {
    const response = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const act = (action, targetId, extra = {}) => request(admin, 'POST', '/admin/actions', { action, targetId, reason: 'Community guidelines review', adminNote: 'Private admin evidence', ...extra });
  const item = await Item.create({ title: 'Study desk', category: 'Furniture', description: 'Wooden desk', price: 300, images: [{ url: 'https://example.test/desk.jpg', publicId: 'test/desk' }], user: b });
  const accommodation = await Accommodation.create({ title: 'Campus studio', location: 'Campus', accommodationType: 'Studio', description: 'Near campus', price: 5000, images: [{ url: 'https://example.test/room.jpg', publicId: 'test/room' }], user: b });
  const sockets = [];
  try {
    await t.test('server-side role and parameter validation', async () => {
      assert.equal((await request(null, 'GET', '/admin/dashboard')).status, 401);
      for (const path of ['/dashboard', '/reports', '/users', '/listings', '/warnings', '/restrictions', '/activity', '/settings']) assert.equal((await request(a, 'GET', `/admin${path}`)).status, 403);
      assert.equal((await request(a, 'POST', '/admin/actions', { action: 'suspend', targetId: b, role: 'admin', reason: 'spoof' })).status, 403);
      assert.equal((await request(a, 'PATCH', '/auth/profile', { fullName: 'Alice', role: 'admin' })).data.role, 'user');
      assert.equal((await request(admin, 'GET', '/admin/reports/bad-id')).status, 400);
      assert.equal((await request(admin, 'GET', '/admin/users?page=-1')).status, 400);
      assert.equal((await request(admin, 'GET', '/admin/dashboard')).data.stats.totalUsers, 4);
      assert.equal((await act('suspend', admin)).status, 403);
      const user = (await request(admin, 'GET', `/admin/users/${a}`)).data.user;
      assert.equal(user.password, undefined); assert.equal(user.verificationToken, undefined);
    });
    let reportId;
    await t.test('report types, ownership, deduplication and rate limit', async () => {
      assert.equal((await request(b, 'POST', '/reports', { targetKind: 'item', targetId: String(item._id), reason: 'Scam / Fraud' })).status, 400);
      const report = await request(a, 'POST', '/reports', { targetKind: 'item', targetId: String(item._id), reason: 'Scam / Fraud', description: '<script>not executable text</script>' });
      assert.equal(report.status, 201); reportId = report.data.id;
      assert.equal((await request(a, 'POST', '/reports', { targetKind: 'item', targetId: String(item._id), reason: 'Spam' })).status, 409);
      assert.equal((await request(a, 'POST', '/reports', { targetKind: 'accommodation', targetId: String(accommodation._id), reason: 'Fake listing' })).status, 201);
      assert.equal((await request(a, 'POST', '/reports', { targetKind: 'user', targetId: b, reason: 'invalid' })).status, 400);
      const result = await request(admin, 'GET', `/admin/reports/${reportId}`);
      assert.equal(result.status, 200); assert.equal(result.data.listing.title, 'Study desk'); assert.equal(result.data.report.reportedId.password, undefined);
      assert.equal((await act('review_report', reportId)).status, 200);
      assert.equal((await act('resolve_report', reportId)).status, 200);
      assert.equal((await act('dismiss_report', reportId)).status, 409);
      for (let i = 0; i < 4; i++) { const target = await User.create({ fullName: `Target ${i}`, email: `target${i}@example.test`, password: 'test-password', verified: true }); const result = await request(a, 'POST', '/reports', { targetKind: 'user', targetId: String(target._id), reason: 'Spam' }); assert.equal(result.status, i === 3 ? 429 : 201); }
    });
    await t.test('warn, freeze, restore, suspension and automatic expiry', async () => {
      assert.equal((await act('warn', b)).status, 200); assert.equal(await Warning.countDocuments({ userId: b }), 1);
      assert.equal((await request(b, 'GET', '/auth/check')).data.accountStatus, 'warned');
      assert.equal((await act('freeze', b, { until: new Date(Date.now() + 86400000).toISOString() })).status, 200);
      assert.equal((await act('freeze', b, { until: new Date(Date.now() + 86400000).toISOString() })).status, 409);
      for (const [method, path] of [['POST', '/items'], ['PUT', `/items/${item._id}`], ['PATCH', `/items/${item._id}/status`], ['DELETE', `/items/${item._id}`], ['POST', '/accommodations'], ['POST', `/messages/send/${a}`]]) assert.equal((await request(b, method, path, { text: 'restricted', status: 'sold' })).status, 403);
      assert.equal((await request(b, 'GET', '/auth/check')).status, 200);
      assert.equal((await act('unfreeze', b)).status, 200);
      assert.equal((await act('suspend', b)).status, 200);
      assert.equal((await request(b, 'POST', `/messages/send/${a}`, { text: 'bypass' })).status, 403);
      assert.equal((await act('restore_account', b)).status, 200);
      assert.equal((await act('freeze', b, { until: new Date(Date.now() + 86400000).toISOString() })).status, 200);
      await User.updateOne({ _id: b }, { $set: { 'restriction.until': new Date(Date.now() - 1000) } });
      assert.equal((await request(b, 'POST', `/messages/send/${a}`, { text: 'After expiry' })).status, 201);
      await expireFreezes(); assert.equal((await User.findById(b)).restriction.status, 'active');
      assert.equal(await ModerationAction.countDocuments({ userId: b, action: 'freeze_expired' }), 1);
      await assert.rejects(ModerationAction.updateMany({}, { $set: { reason: 'tampered' } }), /append-only/);
      assert.equal(await ChatAlert.countDocuments({ kind: 'moderation' }), 0);
    });
    await t.test('listing moderation preserves data and removes public access', async () => {
      for (const [listing, kind, path] of [[item, 'item', 'items'], [accommodation, 'accommodation', 'accommodations']]) {
        assert.equal((await act('hide', String(listing._id), { listingType: kind })).status, 200);
        assert.equal((await request(null, 'GET', `/${path}/${listing._id}`)).status, 404);
        assert.ok(!(await request(null, 'GET', `/${path}`)).data.some(row => row._id === String(listing._id)));
        assert.equal((await request(b, 'PATCH', `/${path}/${listing._id}/status`, { status: 'active' })).status, 403);
        assert.equal((await act('remove', String(listing._id), { listingType: kind })).status, 200);
        assert.equal((await act('remove', String(listing._id), { listingType: kind })).status, 409);
        assert.equal((await act('restore_listing', String(listing._id), { listingType: kind })).status, 200);
        assert.equal((await request(null, 'GET', `/${path}/${listing._id}`)).status, 200);
      }
    });
    await t.test('chat report context excludes unrelated users and future messages', async () => {
      const message = await request(b, 'POST', `/messages/send/${c}`, { text: 'Reported message' });
      const report = await request(c, 'POST', '/reports', { targetKind: 'message', targetId: message.data._id, reason: 'Harassment' }); assert.equal(report.status, 201);
      assert.equal((await request(a, 'POST', '/reports', { targetKind: 'message', targetId: message.data._id, reason: 'Spam' })).status, 429); // rate limit is checked before resolving private targets
      await request(b, 'POST', `/messages/send/${c}`, { text: 'Later message' });
      const detail = await request(admin, 'GET', `/admin/reports/${report.data.id}`);
      assert.deepEqual(detail.data.context.map(m => m.text), ['Reported message']);
    });
    await t.test('push registration, multiple devices, retry, expiry, active conversation and read suppression', async () => {
      const curve = createECDH('prime256v1'); curve.generateKeys();
      const subscription = suffix => ({ endpoint: `https://fcm.googleapis.com/fcm/send/test-${suffix}`, keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } });
      assert.equal((await request(b, 'POST', '/messages/push/subscriptions', { ...subscription('ssrf'), endpoint: 'https://127.0.0.1/private' })).status, 400);
      for (const key of ['one', 'two']) assert.equal((await request(b, 'POST', '/messages/push/subscriptions', subscription(key))).status, 201);
      assert.equal((await request(a, 'POST', '/messages/push/subscriptions', { ...subscription('one'), keys: { ...subscription('one').keys, auth: Buffer.alloc(16, 2).toString('base64url') } })).status, 409);
      await request(b, 'POST', '/messages/push/subscriptions', subscription('one')); assert.equal(await PushSubscription.countDocuments({ userId: b }), 2);
      await request(a, 'DELETE', '/messages/push/subscriptions', { endpoint: subscription('one').endpoint }); assert.equal(await PushSubscription.countDocuments({ userId: b }), 2);
      await ChatAlert.updateMany({}, { dispatchedAt: new Date(), readAt: new Date() });
      const socket = client(base, { auth: { token: tokens[b] }, reconnection: false }); sockets.push(socket); await new Promise(resolve => socket.once('connect', resolve));
      const realtime = new Promise(resolve => socket.once('newMessage', resolve));
      const sent = await request(a, 'POST', `/messages/send/${b}`, { text: 'Private message body' }); assert.equal((await realtime)._id, sent.data._id);
      assert.equal((await request(b, 'GET', '/messages/unread/count')).data.total, 1);
      await dispatchChatAlerts(); await dispatchChatAlerts(); assert.equal(await PushDelivery.countDocuments(), 2);
      const delivered = []; await deliverPush(async (sub, payload) => delivered.push({ sub, payload })); await deliverPush(async (sub, payload) => delivered.push({ sub, payload })); await deliverPush(async () => { throw new Error('Duplicate delivery'); });
      assert.equal(delivered.length, 2); assert.ok(delivered.every(value => !value.payload.includes('Private message body'))); assert.equal(JSON.parse(delivered[0].payload).url, `/chat/${a}`);
      await request(b, 'POST', `/messages/seen/${a}`, { messageIds: [sent.data._id] }); assert.equal((await request(b, 'GET', '/messages/unread/count')).data.total, 0);
      socket.emit('chat:activity', true); await new Promise(resolve => setTimeout(resolve, 60));
      const activeMessage = await request(a, 'POST', `/messages/send/${b}`, { text: 'Actively viewing' }); assert.equal(activeMessage.data.seen, true); assert.equal(await ChatAlert.countDocuments({ messageId: activeMessage.data._id }), 0); await dispatchChatAlerts(); for (let i = 0; i < 2; i++) await deliverPush(async () => assert.fail('Active conversation must not push'));
      socket.emit('chat:activity', false); await new Promise(resolve => setTimeout(resolve, 60));
      await request(a, 'POST', `/messages/send/${b}`, { text: 'Expired endpoint' }); await dispatchChatAlerts(); await deliverPush(async () => { throw { statusCode: 410 }; }); assert.equal(await PushSubscription.countDocuments({ userId: b }), 1);
      await deliverPush(async () => { throw { statusCode: 503 }; }); const retry = await PushDelivery.findOne({ status: 'pending' }); assert.ok(retry); await PushDelivery.updateOne({ _id: retry._id }, { nextAttemptAt: new Date(0) }); await deliverPush(async () => {}); assert.equal((await PushDelivery.findById(retry._id)).status, 'sent');
      await User.updateOne({ _id: b }, { 'preferences.messages': false }); await request(a, 'POST', `/messages/send/${b}`, { text: 'Muted' }); await dispatchChatAlerts(); assert.equal(await PushDelivery.countDocuments({ status: 'pending' }), 0);
      await request(b, 'POST', '/messages/seen-all'); assert.equal((await request(b, 'GET', '/messages/unread/count')).data.total, 0);
    });
    for (const path of ['/reports?status=resolved', `/users/${b}`, '/listings?reported=true', '/listings?kind=accommodation', '/warnings', '/restrictions', '/activity', '/settings']) assert.equal((await request(admin, 'GET', `/admin${path}`)).status, 200);
  } finally { sockets.forEach(socket => socket.disconnect()); await new Promise(resolve => server.close(resolve)); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});
