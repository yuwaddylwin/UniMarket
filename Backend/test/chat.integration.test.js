import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import { io as client } from '../../frontend/node_modules/socket.io-client/build/esm-debug/index.js';
import User from '../src/models/user.model.js';
import Message from '../src/models/message.model.js';
import Report from '../src/models/report.model.js';
import { app, server } from '../src/lib/socket.js';
import messageRoutes from '../src/routes/message.route.js';
import authRoutes from '../src/routes/auth.route.js';

// Explicit isolated database only; never load application .env credentials.
const uri = process.env.CHAT_TEST_MONGO_URL;
test('authenticated chat safety, persistence, realtime and report persistence', { skip: !uri }, async () => {
  assert.match(uri, /127\.0\.0\.1:27029/);
  process.env.JWT_SECRET = 'isolated-chat-test-secret';
  const init = await mongoose.createConnection(`${uri}/admin?directConnection=true`).asPromise();
  try { await init.db.admin().command({ replSetInitiate: { _id: 'chatTest', members: [{ _id: 0, host: '127.0.0.1:27029' }] } }); } catch (error) { if (error.code !== 23) throw error; }
  await init.close();
  await mongoose.connect(`${uri}/unimarket_chat_tests?replicaSet=chatTest`);
  await mongoose.connection.dropDatabase();
  await Report.init();
  app.use(express.json()); app.use('/api/messages', messageRoutes); app.use('/api/auth', authRoutes);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const users = await User.create(['A', 'B', 'C'].map(name => ({ fullName: name, email: `${name}@example.test`, password: 'test-password', verified: true })));
  const [a,b,c] = users.map(u => String(u._id));
  const tokens = Object.fromEntries(users.map(u => [String(u._id), jwt.sign({ userId: u._id }, process.env.JWT_SECRET)]));
  const request = async (who, method, path, body) => {
    const response = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  };
  const sockets = [];
  try {
    const spoof = client(base, { query: { userId: a }, reconnection: false }); sockets.push(spoof);
    await new Promise((resolve,reject) => { spoof.once('connect_error', resolve); spoof.once('connect', () => reject(new Error('Unauthenticated socket connected'))); });
    const socket = client(base, { auth: { token: tokens[a] }, reconnection: false }); sockets.push(socket);
    await new Promise(resolve => socket.once('connect', resolve));
    assert.equal((await request(null, 'POST', `/messages/send/${b}`, { text: 'hello' })).status, 401);
    assert.equal((await request(a, 'POST', '/messages/send/invalid', { text: 'hello' })).status, 400);
    assert.equal((await request(a, 'POST', `/messages/send/${a}`, { text: 'hello' })).status, 400);
    assert.equal((await request(a, 'POST', `/messages/send/${b}`, {})).status, 400);
    // Legacy users with absent/null block lists have no relationship.
    await User.collection.updateOne({ _id: users[0]._id }, { $unset: { blockedUsers: '' } });
    await User.collection.updateOne({ _id: users[1]._id }, { $set: { blockedUsers: null } });
    for (const [me, other] of [[a,b],[b,a]]) {
      assert.deepEqual((await request(me, 'GET', `/messages/safety/${other}`)).data, { blockedByMe: false, messagingBlocked: false });
      assert.equal((await request(me, 'POST', `/messages/send/${other}`, { text: 'Legacy conversation' })).status, 201);
    }
    await User.collection.updateOne({ _id: users[1]._id }, { $set: { blockedUsers: [] } });
    // Blocking C must not restrict either direction of A/B.
    await request(a, 'POST', `/auth/blocked-users/${c}`);
    await request(b, 'POST', `/auth/blocked-users/${c}`);
    for (const [me, other] of [[a,b],[b,a]]) {
      assert.equal((await request(me, 'GET', `/messages/safety/${other}`)).data.messagingBlocked, false);
      assert.equal((await request(me, 'POST', `/messages/send/${other}`, { text: 'Unrelated block' })).status, 201);
    }
    await request(a, 'DELETE', `/auth/blocked-users/${c}`);
    await request(b, 'DELETE', `/auth/blocked-users/${c}`);
    const sent = await request(a, 'POST', `/messages/send/${b}`, { text: 'hello' });
    assert.equal(sent.status, 201); assert.equal(sent.data.seen, false); assert.ok(sent.data.createdAt);
    assert.equal((await request(c, 'DELETE', `/messages/${b}`)).status, 404);
    await request(c, 'POST', `/messages/seen/${a}`, { messageIds: [sent.data._id] });
    assert.equal((await Message.findById(sent.data._id)).seen, false);
    const seenEvent = new Promise(resolve => socket.once('messagesSeen', resolve));
    const seen = await request(b, 'POST', `/messages/seen/${a}`, { messageIds: [sent.data._id] });
    assert.equal(seen.status, 200); assert.deepEqual((await seenEvent).messageIds, [sent.data._id]);
    assert.ok((await Message.findById(sent.data._id)).seenAt);
    assert.equal((await request(a, 'POST', `/auth/blocked-users/${b}`)).status, 200);
    assert.equal((await request(a, 'POST', `/auth/blocked-users/${b}`)).status, 200);
    assert.equal((await request(b, 'POST', `/messages/send/${a}`, { text: 'blocked' })).status, 403);
    assert.equal((await request(a, 'POST', `/messages/send/${b}`, { text: 'blocked' })).status, 403);
    assert.equal((await request(a, 'GET', '/auth/blocked-users')).data[0]._id, b);
    assert.equal((await request(a, 'GET', `/messages/safety/${b}`)).data.blockedByMe, true);
    await request(a, 'DELETE', `/auth/blocked-users/${b}`);
    assert.equal((await request(a, 'DELETE', `/auth/blocked-users/${b}`)).status, 200);
    assert.equal((await request(b, 'POST', `/messages/send/${a}`, { text: 'unblocked' })).status, 201);
    // Fresh authentication and old conversation reads must reflect the stored unblock.
    for (const [me, other] of [[a,b],[b,a]]) {
      tokens[me] = jwt.sign({ userId: me }, process.env.JWT_SECRET);
      assert.equal((await request(me, 'GET', `/messages/safety/${other}`)).data.messagingBlocked, false);
      assert.ok((await request(me, 'GET', `/messages/${other}`)).data.length > 0);
      assert.equal((await request(me, 'POST', `/messages/send/${other}`, { text: 'After reauthentication' })).status, 201);
    }

    // Concurrent operations must settle with all later sends rejected.
    await Promise.all([request(a, 'POST', `/auth/blocked-users/${b}`), ...Array.from({length: 8}, () => request(b, 'POST', `/messages/send/${a}`, { text: 'race' }))]);
    assert.equal((await request(b, 'POST', `/messages/send/${a}`, { text: 'after block' })).status, 403);
    assert.equal(await Message.countDocuments({ text: 'after block' }), 0);
    assert.equal((await request(a, 'POST', `/messages/report/${b}`, { reason: ' ' })).status, 400);
    const report = await request(a, 'POST', `/messages/report/${b}`, { reason: 'Abusive messages' });
    assert.equal(report.status, 201);
    assert.equal((await request(a, 'POST', `/messages/report/${b}`, { reason: 'duplicate' })).status, 409);
    assert.equal(await Report.countDocuments(), 1);
    const savedReport = await Report.findById(report.data.id);
    assert.equal(savedReport.reason, 'Abusive messages');
    assert.equal(savedReport.status, 'pending');
    assert.equal((await request(a, 'DELETE', `/messages/${b}`)).status, 200);
    assert.equal(await Message.countDocuments(), 0);
    assert.equal((await request(a, 'GET', `/messages/${b}`)).data.length, 0);
    assert.equal((await request(a, 'DELETE', `/messages/${b}`)).status, 404);
  } finally {
    sockets.forEach(s => s.disconnect());
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  }
});
