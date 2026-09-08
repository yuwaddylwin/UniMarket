import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import express from 'express';
import cookieParser from 'cookie-parser';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import User from '../src/models/user.model.js';
import routes from '../src/routes/auth.route.js';
import { Challenge, digest, originGuard } from '../src/services/authSecurity.js';
import { migrateUsernames } from '../src/services/usernameMigration.js';

const uri = process.env.AUTH_TEST_MONGO_URL;
test('authentication end-to-end with isolated MongoDB and mocked mail/Google transport', { skip: !uri, timeout: 120000 }, async t => {
  assert.match(uri, /auth_test(?:[/?]|$)/);
  Object.assign(process.env, { JWT_SECRET: 'auth-test-secret-not-production', CLIENT_URL: 'http://localhost:3000', SMTP_HOST: 'test', SMTP_PORT: '587', SMTP_USER: 'test', SMTP_PASS: 'test', EMAIL_FROM: 'test@example.test', GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', GOOGLE_REDIRECT_URI: 'http://localhost:8000/api/auth/google/callback' });
  const mail = [];
  mock.method(nodemailer, 'createTransport', () => ({ verify: async () => true, close() {}, sendMail: async message => { mail.push(message); return { accepted: [message.to], rejected: [] }; } }));
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await User.init();
  const oldId = new mongoose.Types.ObjectId();
  await User.collection.insertOne({ _id: oldId, fullName: 'Legacy User', email: 'old@example.test', password: await bcrypt.hash('oldpass', 10), verified: true });
  await User.collection.insertMany([{ fullName: 'Mixed', email: 'mixed1@example.test', username: 'Mixed_User' }, { fullName: 'Canonical', email: 'mixed2@example.test', username: 'mixed_user' }, { fullName: 'Invalid', email: 'dot@example.test', username: 'old.dot' }]);
  const app = express(); app.use(express.json(), cookieParser(), originGuard); app.use('/auth', routes);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const request = async (path, body, cookie = '', method = body ? 'POST' : 'GET', origin) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/auth${path}`, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const raw = await res.text(); let data; try { data = JSON.parse(raw); } catch { data = raw; }
    return { status: res.status, data, cookie: res.headers.getSetCookie().map(c => c.split(';')[0]).join('; '), headers: res.headers };
  };
  const code = () => mail.at(-1).text.match(/\b\d{6}\b/)[0];
  const signup = { fullName: 'New User', username: 'new_user', email: 'new@example.test', password: 'sensible-password' };
  let session;
  try {
    await t.test('migration preserves IDs and data, is repeatable, enforces database uniqueness', async () => {
      assert.equal(await migrateUsernames(), 3); assert.equal(await migrateUsernames(), 0);
      assert.equal((await User.findOne({ email: 'mixed2@example.test' })).username, 'mixed_user');
      assert.match((await User.findOne({ email: 'mixed1@example.test' })).username, /^user_/);
      const old = await User.findById(oldId); assert.equal(old.username, `user_${oldId}`); assert.equal(old.fullName, 'Legacy User');
      await assert.rejects(User.collection.insertOne({ username: old.username.toUpperCase(), email: 'x@example.test' }));
      await assert.rejects(User.collection.insertOne({ email: 'missing@example.test' }));
      const login = await request('/login', { email: old.email, password: 'oldpass' }); assert.equal(login.status, 200); assert.equal(String(login.data._id), String(oldId));
    });
    await t.test('signup validates inputs and handles concurrent case-insensitive duplicates', async () => {
      for (const override of [{ username: 'bad space' }, { email: 'bad' }, { password: 'short' }, { fullName: '' }]) assert.equal((await request('/signup', { ...signup, ...override })).status, 400);
      const results = await Promise.all([request('/signup', signup), request('/signup', { ...signup, username: 'NEW_USER', email: 'race@example.test' })]);
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      const winner = await User.findOne({ username: 'new_user' }); signup.email = winner.email;
      assert.equal((await request('/signup', { ...signup, username: 'another' })).status, 409);
      assert.equal((await request('/username?username=NEW_USER')).data.available, false);
      assert.equal((await request('/username?username=unused_name')).data.available, true);
      assert.equal((await request('/login', { identifier: 'new_user', password: signup.password })).status, 401);
      const challenge = await Challenge.findById(`verify:${signup.email}`); assert.notEqual(challenge.hash, code());
    });
    await t.test('OTP incorrect, expiry, attempt cap, resend, single-use and auto-login', async () => {
      assert.equal((await request('/verify-code', { email: signup.email, code: '000000' })).status, 400);
      await Challenge.updateOne({ _id: `verify:${signup.email}` }, { $set: { expires: new Date(0) } });
      assert.equal((await request('/verify-code', { email: signup.email, code: code() })).status, 400);
      await Challenge.updateOne({ _id: `verify:${signup.email}` }, { $set: { sentAt: new Date(0) } });
      assert.equal((await request('/resend-verification', { email: signup.email })).status, 200);
      assert.equal((await request('/resend-verification', { email: signup.email })).status, 429);
      for (let i = 0; i < 5; i++) assert.equal((await request('/verify-code', { email: signup.email, code: '000000' })).status, 400);
      assert.equal((await request('/verify-code', { email: signup.email, code: code() })).status, 400);
      await Challenge.updateOne({ _id: `verify:${signup.email}` }, { $set: { sentAt: new Date(0) } });
      await request('/resend-verification', { email: signup.email });
      const verified = await request('/verify-code', { email: signup.email, code: code() });
      assert.equal(verified.status, 200); session = verified.cookie; assert.ok(session.startsWith('jwt='));
      assert.match(verified.headers.get('set-cookie'), /HttpOnly/); assert.equal(verified.data.token, undefined); assert.equal(verified.data.password, undefined);
      assert.equal((await request('/verify-code', { email: signup.email, code: code() })).status, 400);
    });
    await t.test('login, protected profile, immutable username, CSRF, reset and session revocation', async () => {
      for (const identifier of ['NEW_USER', signup.email]) assert.equal((await request('/login', { identifier, password: signup.password })).status, 200);
      for (const identifier of ['new_user', 'missing', 'missing@example.test']) assert.equal((await request('/login', { identifier, password: 'wrong' })).status, 401);
      assert.equal((await request('/me')).status, 401);
      assert.equal((await request('/me', null, session)).status, 200);
      assert.equal((await request('/profile', { fullName: 'Updated Name' }, session, 'PATCH')).data.fullName, 'Updated Name');
      assert.equal((await request('/profile', { fullName: 'Updated Name', username: 'hacked' }, session, 'PATCH')).status, 400);
      assert.equal((await request('/profile', { fullName: 'CSRF' }, session, 'PATCH', 'https://evil.example')).status, 403);
      const user = await User.findOne({ username: 'new_user' }); user.username = 'hacked'; await user.save(); assert.equal((await User.findById(user._id)).username, 'new_user');
      assert.equal((await request('/forgot-password', { email: 'new_user' })).status, 400);
      assert.equal((await request('/forgot-password', { email: signup.email })).status, 200);
      assert.equal((await request('/reset-password', { email: signup.email, code: code(), password: 'replacement-password' })).status, 200);
      assert.equal((await request('/me', null, session)).status, 401);
      const login = await request('/login', { email: signup.email, password: 'replacement-password' }); session = login.cookie;
      assert.equal(login.status, 200); assert.equal((await request('/logout', {}, session)).status, 200); assert.equal((await request('/me', null, session)).status, 401);
    });
    await t.test('previous verification links still activate existing accounts', async () => {
      await User.create({ fullName: 'Link User', username: 'link_user', email: 'link@example.test', password: await bcrypt.hash('password', 10), verificationToken: 'legacy-token', verificationTokenExpires: new Date(Date.now() + 60000) });
      assert.equal((await request('/verify/legacy-token')).status, 200); assert.equal((await request('/verify/legacy-token')).status, 400);
    });
    await t.test('Google state validation, cancellation, new user, duplicates, existing identity and secure linking', async () => {
      assert.match((await request('/google/callback?state=invalid&code=x')).headers.get('location'), /google=failed/);
      const start = await request('/google'); const url = new URL(start.headers.get('location')); const state = url.searchParams.get('state');
      assert.ok(url.searchParams.get('code_challenge')); assert.equal((await request(`/google/callback?state=${state}&error=access_denied`, null, start.cookie)).headers.get('location'), 'http://localhost:3000/login?google=cancelled');
      let identity;
      mock.method(OAuth2Client.prototype, 'getToken', async () => ({ tokens: { id_token: 'mock-verified-token' } }));
      mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({ getPayload: () => identity }));
      async function oauth(email, sub) {
        const start = await request('/google'); const url = new URL(start.headers.get('location'));
        identity = { sub, email, email_verified: true, nonce: url.searchParams.get('nonce'), name: 'Google User' };
        return request(`/google/callback?state=${url.searchParams.get('state')}&code=mock`, null, start.cookie);
      }
      let callback = await oauth('google@gmail.com', 'google-1'); let pending = callback.cookie;
      assert.equal((await request('/google/pending', null, pending)).data.needsUsername, true);
      assert.equal((await request('/google/complete', { username: 'NEW_USER' }, pending)).status, 409);
      const complete = await request('/google/complete', { username: 'google_user' }, pending); assert.equal(complete.status, 200); assert.equal(complete.data.username, 'google_user');
      assert.equal((await request('/profile', { fullName: 'Google Display Name' }, complete.cookie, 'PATCH')).status, 200);
      assert.equal((await request('/google/complete', { username: 'google_other' }, pending)).status, 401);
      callback = await oauth('google@gmail.com', 'google-1'); assert.ok(callback.cookie.includes('jwt='));
      callback = await oauth(signup.email, 'linked-sub'); pending = callback.cookie;
      assert.equal((await request('/google/pending', null, pending)).data.needsCode, true);
      assert.equal((await request('/google/complete', { code: '000000' }, pending)).status, 400);
      const linked = await request('/google/complete', { code: code() }, pending); assert.equal(linked.status, 200); assert.equal(linked.data.username, 'new_user');
      assert.equal(await User.countDocuments({ email: signup.email }), 1);
      await User.create({ fullName: 'Unverified Owner', username: 'unverified_owner', email: 'unverified@gmail.com', password: await bcrypt.hash('attacker-password', 10) });
      const unverifiedFlow = await oauth('unverified@gmail.com', 'unverified-sub');
      const claimed = await request('/google/complete', { code: code() }, unverifiedFlow.cookie);
      assert.equal(claimed.status, 200);
      assert.equal((await User.findOne({ username: 'unverified_owner' }).select('+password')).password, undefined);
      const startBad = await request('/google'); const badUrl = new URL(startBad.headers.get('location')); identity = { ...identity, nonce: 'wrong' };
      assert.match((await request(`/google/callback?state=${badUrl.searchParams.get('state')}&code=bad`, null, startBad.cookie)).headers.get('location'), /google=failed/);
    });
    await t.test('rate limit rejects repeated login attempts', async () => {
      let result; for (let i = 0; i < 22; i++) result = await request('/login', { identifier: 'missing', password: 'bad' }); assert.equal(result.status, 429);
    });
  } finally { mock.restoreAll(); await new Promise(resolve => server.close(resolve)); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
});
