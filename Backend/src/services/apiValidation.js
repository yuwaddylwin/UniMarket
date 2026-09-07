import mongoose from 'mongoose';
import { fail } from './chatSafety.js';
export const id = value => { if (!mongoose.isObjectIdOrHexString(value)) fail(400, 'Invalid ID'); return value; };
export function text(value, label, required = false, max = 2000) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, `Enter ${label} (up to ${max} characters)`);
  return value.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}
export const choice = (value, choices, label) => { if (!choices.includes(value)) fail(400, `Invalid ${label}`); return value; };
export function paging(query) {
  const page = Number(query.page || 1), limit = Number(query.limit || 20);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 50) fail(400, 'Invalid pagination');
  return { page, limit, skip: (page - 1) * limit };
}
export const search = value => new RegExp(text(value, 'search', false, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
export function dates(query) {
  const result = {};
  for (const [key, operator] of [['from', '$gte'], ['to', '$lte']]) if (query[key]) {
    const value = new Date(query[key]); if (!Number.isFinite(value.getTime())) fail(400, 'Invalid date');
    if (key === 'to') value.setUTCHours(23, 59, 59, 999);
    result[operator] = value;
  }
  return Object.keys(result).length ? { createdAt: result } : {};
}
export const endpoint = action => async (req, res) => {
  try { await action(req, res); } catch (error) {
    const status = error.code === 11000 ? 409 : error.status || (error.name === 'ValidationError' ? 400 : 500);
    if (status === 500) console.error('Moderation/notification operation failed', error.name);
    res.status(status).json({ message: error.code === 11000 ? 'An unresolved report already exists for this target.' : error.status ? error.message : status === 400 ? 'Please check the supplied values.' : 'Unable to complete this request. Please try again.' });
  }
};
