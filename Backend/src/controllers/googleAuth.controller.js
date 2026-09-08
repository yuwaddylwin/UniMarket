import { googleSettings, googleConfiguration } from '../services/googleConfig.js';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.model.js';
import { Challenge, random, digest, cookieOptions, establishSession, normalize, validUsername } from '../services/authSecurity.js';
import { safeAuth, issueCode, consumeCode } from './authFlow.controller.js';
import { serializePublicUser } from './auth.controller.js';
const configured = () => googleConfiguration().enabled;
const client = () => new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, googleSettings().redirectUri);
const flowCookie = () => ({ ...cookieOptions(), sameSite: 'lax', maxAge: 600000 });
export const googleConfig = (req, res) => res.json(googleConfiguration());
export const googleStart = safeAuth(async (req, res) => {
  if (!configured()) return res.status(503).json({ message: googleConfiguration().message });
  const state = random(), nonce = random(), verifier = random();
  await Challenge.create({ _id: `oauth:${digest(state)}`, expires: new Date(Date.now() + 600000), data: { nonce, verifier } });
  res.cookie('google_state', state, flowCookie());
  // Use a persisted PKCE verifier whose challenge is derived below.
  const { createHash } = await import('node:crypto');
  res.redirect(client().generateAuthUrl({ access_type: 'online', scope: ['openid', 'email', 'profile'], state, nonce, prompt: 'select_account', code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }));
});
export const googleCallback = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  const settings = googleConfiguration();
  if (!settings.enabled) return res.status(503).send('Google sign-in URLs are misconfigured. Return to UniMarket and contact support.');
  const redirect = suffix => res.redirect(`${googleSettings().frontendOrigin}${suffix}`);
  let failure = 'state';
  try {
    if (!configured()) return res.status(503).send('Google sign-in is not configured.');
    const state = req.query.state;
    if (typeof state !== 'string' || !state || state !== req.cookies?.google_state) throw new Error('Invalid state');
    res.clearCookie('google_state', flowCookie());
    const flow = await Challenge.findOneAndDelete({ _id: `oauth:${digest(state)}`, expires: { $gt: new Date() } });
    if (!flow) throw new Error('Expired state');
    if (req.query.error) return redirect('/login?google=cancelled');
    if (typeof req.query.code !== 'string') throw new Error('Missing code');
    failure = 'exchange';
    const oauth = client();
    const { tokens } = await oauth.getToken({ code: req.query.code, codeVerifier: flow.data.verifier, redirect_uri: googleSettings().redirectUri });
    failure = 'identity';
    const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const identity = ticket.getPayload();
    if (!identity?.sub || !identity.email || !identity.email_verified || identity.nonce !== flow.data.nonce) throw new Error('Invalid identity');
    failure = 'account';
    const user = await User.findOne({ googleSub: identity.sub }).select('+sessionVersion');
    if (user?.verified) { establishSession(res, user); return redirect('/auth/google/complete'); }
    const email = normalize(identity.email);
    const existing = await User.findOne({ email });
    // Explicit fresh email proof for ALL matching accounts: never silently link by email.
    const needsCode = Boolean(existing) || !(email.endsWith('@gmail.com') || identity.hd);
    if (needsCode) await issueCode(email, 'google');
    const pending = random();
    await Challenge.create({ _id: `google:${digest(pending)}`, expires: new Date(Date.now() + 600000), data: { sub: identity.sub, email, fullName: (identity.name || 'UniMarket member').slice(0, 80), existingId: existing ? String(existing._id) : null, wasUnverified: existing?.verified === false, needsCode } });
    res.cookie('google_pending', pending, { ...cookieOptions(), maxAge: 600000 });
    return redirect('/auth/google/complete');
  } catch { return redirect(`/login?google=failed&reason=${failure}`); }
};
async function pendingFlow(req) {
  if (!req.cookies?.google_pending) return null;
  return Challenge.findOne({ _id: `google:${digest(req.cookies.google_pending)}`, expires: { $gt: new Date() } });
}
export const googlePending = safeAuth(async (req, res) => {
  const flow = await pendingFlow(req);
  if (!flow) return res.status(401).json({ message: 'Google session expired. Please sign in again.' });
  res.json({ email: flow.data.email, needsCode: flow.data.needsCode, needsUsername: !flow.data.existingId });
});
export const googleResend = safeAuth(async (req, res) => {
  const flow = await pendingFlow(req);
  if (!flow || !flow.data.needsCode) return res.status(400).json({ message: 'Please restart Google sign-in.' });
  await issueCode(flow.data.email, 'google');
  res.json({ message: 'A new code has been sent.' });
});
export const googleComplete = safeAuth(async (req, res) => {
  const flow = await pendingFlow(req);
  if (!flow) return res.status(401).json({ message: 'Google session expired. Please sign in again.' });
  const { email, sub, fullName, existingId, needsCode } = flow.data;
  const username = normalize(req.body?.username);
  if (!existingId && !validUsername(username)) return res.status(400).json({ message: 'Use 3–30 letters, numbers, or underscores.' });
  if (!existingId && await User.exists({ username })) return res.status(409).json({ message: 'Username is already taken.' });
  if (needsCode && !flow.data.codeVerified) {
    await consumeCode(email, 'google', req.body?.code);
    await Challenge.updateOne({ _id: flow._id }, { $set: { 'data.codeVerified': true } });
  }
  // Claim once before linking / creating; uniqueness remains enforced by MongoDB.
  const claimed = await Challenge.findOneAndDelete({ _id: flow._id, expires: { $gt: new Date() } });
  if (!claimed) return res.status(409).json({ message: 'Google session was already used. Please sign in again.' });
  let user;
  if (existingId) {
    user = await User.findOneAndUpdate({ _id: existingId, email, $or: [{ googleSub: { $exists: false } }, { googleSub: sub }] }, { $set: { googleSub: sub, verified: true, verificationToken: null, verificationTokenExpires: null }, ...(flow.data.wasUnverified ? { $unset: { password: '' }, $inc: { sessionVersion: 1 } } : {}) }, { new: true }).select('+sessionVersion');
    if (!user) return res.status(409).json({ message: 'This account is linked to a different Google identity.' });
  } else {
    try { user = await User.create({ fullName, username, email, googleSub: sub, verified: true }); }
    catch (error) { await Challenge.create(claimed.toObject()); throw error; }
  }
  res.clearCookie('google_pending', cookieOptions());
  establishSession(res, user); res.json(serializePublicUser(user));
});
