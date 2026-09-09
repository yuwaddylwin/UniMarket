// Disposable browser verification server. No production DB or SMTP is used.
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { createRequire } from 'node:module';
const { createServer } = createRequire(import.meta.url)('../../frontend/server.cjs');
import routes from '../src/routes/auth.route.js';
import { originGuard } from '../src/services/authSecurity.js';
import { migrateUsernames } from '../src/services/usernameMigration.js';
import User from '../src/models/user.model.js';
if (process.env.UNIMARKET_AUTH_PREVIEW !== 'isolated') throw new Error('Explicit isolated preview required');
Object.assign(process.env, { JWT_SECRET: 'isolated-browser-secret', CLIENT_URL: `http://localhost:${process.env.AUTH_BROWSER_PORT || 8738}`, NODE_ENV: 'development', SMTP_HOST: 'test', SMTP_PORT: '587', SMTP_USER: 'test', SMTP_PASS: 'test', EMAIL_FROM: 'test@example.test' });
delete process.env.GOOGLE_CLIENT_ID;
if (process.env.UNIMARKET_GOOGLE_PREVIEW === 'mock') {
  const { OAuth2Client } = await import('google-auth-library');
  Object.assign(process.env, { GOOGLE_CLIENT_ID: 'browser-test-client', GOOGLE_CLIENT_SECRET: 'browser-test-secret', GOOGLE_REDIRECT_URI: `${process.env.CLIENT_URL}/api/auth/google/callback` });
  OAuth2Client.prototype.getToken = async ({ code }) => ({ tokens: { id_token: code } });
  OAuth2Client.prototype.verifyIdToken = async ({ idToken }) => ({ getPayload: () => ({ sub: 'browser-google-sub', email: 'browser-google@gmail.com', email_verified: true, name: 'Browser Google User', nonce: idToken }) });
}
const emails = new Map();
nodemailer.createTransport = () => ({ verify: async () => true, close() {}, sendMail: async message => { emails.set(message.to, message.text.match(/\b\d{6}\b/)[0]); return { accepted: [message.to], rejected: [] }; } });
await mongoose.connect('mongodb://127.0.0.1:27028/auth_browser_proxy_test?replicaSet=authTest');
await mongoose.connection.dropDatabase(); await User.init(); await migrateUsernames();
const app = express(); app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }), express.json(), cookieParser(), originGuard);
app.use('/api/auth', routes);
app.get('/test-mail/:email', (req, res) => res.json({ code: emails.get(req.params.email) }));
app.get('/api/messages/unread/count', (req, res) => res.json({ byUser: [], total: 0 }));
app.get(['/api/items/mine', '/api/accommodations/mine'], (req, res) => res.json([]));
app.listen(Number(process.env.AUTH_BROWSER_API_PORT || 18028), '127.0.0.1', () => console.log('Isolated auth API ready'));
createServer({ target: `http://127.0.0.1:${process.env.AUTH_BROWSER_API_PORT || 18028}` }).listen(Number(process.env.AUTH_BROWSER_PORT || 8738), '127.0.0.1', () => console.log('Auth browser proxy ready'));
