import { proxyClientIp } from './proxyIdentity.js';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

export const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const validUsername = value => /^[a-z0-9_]{3,30}$/.test(value);
export const validPassword = value => typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value) <= 72;
export const digest = value => crypto.createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
export const random = () => crypto.randomBytes(32).toString('hex');
export const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
export function establishSession(res, user) {
  res.cookie('jwt', jwt.sign({ userId: user._id, version: user.sessionVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '7d' }), { ...cookieOptions(), maxAge: 604800000 });
}
const challengeSchema = new mongoose.Schema({
  _id: String, hash: String, attempts: { type: Number, default: 0 }, expires: Date,
  sentAt: Date, data: mongoose.Schema.Types.Mixed,
});
challengeSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });
export const Challenge = mongoose.model('AuthChallenge', challengeSchema);
const rateSchema = new mongoose.Schema({ _id: String, count: Number, expires: Date });
rateSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });
const Rate = mongoose.model('AuthRate', rateSchema);
export function rateLimit(max = 20, minutes = 15, account = false) {
  return async (req, res, next) => {
    try {
      const window = Math.floor(Date.now() / (minutes * 60000));
      const identities = [proxyClientIp(req)];
      if (account) identities.push(`account:${normalize(req.body?.identifier ?? req.body?.email)}`);
      for (const identity of identities) {
      const key = digest(`${identity}:${req.path}:${window}`);
      const bucket = await Rate.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expires: new Date((window + 1) * minutes * 60000) } }, { upsert: true, new: true });
      if (bucket.count > max) return res.status(429).json({ message: 'Too many attempts. Please try again later.' });
      }
      next();
    } catch { res.status(503).json({ message: 'Please try again later.' }); }
  };
}
export function originGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const allowed = [process.env.CLIENT_URL, ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : [])].filter(Boolean).map(v => new URL(v).origin);
  if ((req.headers.origin && !allowed.includes(req.headers.origin)) || (!req.headers.origin && req.headers['sec-fetch-site'] === 'cross-site')) return res.status(403).json({ message: 'Request origin is not allowed.' });
  next();
}
