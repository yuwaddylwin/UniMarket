// Disposable browser-test fixtures; this server cannot point at the live database.
import fs from 'node:fs';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import User from '../src/models/user.model.js';
import Item from '../src/models/ItemsList.model.js';
import Accommodation from '../src/models/Accommodation.model.js';
import Report from '../src/models/report.model.js';
import Message from '../src/models/message.model.js';
import { app, server } from '../src/lib/socket.js';
import adminRoutes from '../src/routes/admin.route.js';
import reportRoutes from '../src/routes/reports.route.js';
import messageRoutes from '../src/routes/message.route.js';
import authRoutes from '../src/routes/auth.route.js';
import itemRoutes from '../src/routes/Items.route.js';
import accommodationRoutes from '../src/routes/accommodations.route.js';
import { migrateReports } from '../src/services/moderationMaintenance.js';
import { startChatAlertWorker } from '../src/services/chatAlerts.js';
if (process.env.UNIMARKET_PREVIEW !== 'isolated') throw new Error('Set UNIMARKET_PREVIEW=isolated to run browser fixtures');
process.env.JWT_SECRET = 'local-preview-only-secret';
await mongoose.connect('mongodb://127.0.0.1:27029/unimarket_admin_preview?replicaSet=chatTest');
await mongoose.connection.dropDatabase();
await Promise.all([User.init(), Item.init(), Accommodation.init(), Report.init(), Message.init()]);
await migrateReports();
const [admin, seller, reporter] = await User.create([
  { fullName: 'UniMarket Moderator', username: 'unimarket_moderator', email: 'moderator@example.test', role: 'admin' },
  { fullName: 'Alex Chen', email: 'alex@example.test', username: 'alex_chen' },
  { fullName: 'Maya Lin', email: 'maya@example.test', username: 'maya_lin' },
].map(user => ({ ...user, verified: true, password: 'preview-only-password' })));
const listing = await Item.create({ title: 'Adjustable study desk', description: 'A compact wooden desk for student rooms. Includes a drawer and adjustable legs.', category: 'Furniture', price: 850, user: seller._id, images: [{ url: 'http://localhost:3001/Images/placeholder.png', publicId: 'preview/desk' }] });
const accommodation = await Accommodation.create({ title: 'Campus Studio', description: 'A studio close to the university.', location: 'Near campus', accommodationType: 'Studio', price: 6500, user: seller._id, images: [{ url: 'http://localhost:3001/Images/unimarket/accommodation.jpg', publicId: 'preview/room' }] });
const message = await Message.create({ senderId: seller._id, receivedId: reporter._id, text: 'Please send the deposit first so I can reserve the listing.' });
const report = await Report.create({ reporterId: reporter._id, reportedId: seller._id, targetKind: 'message', targetKey: `message:${message._id}`, reportedMessageId: message._id, conversationId: [String(reporter._id), String(seller._id)].sort().join(':'), reason: 'Scam / Fraud', description: 'The seller requested a deposit before allowing a viewing. Please review the conversation.' });
await Report.create({ reporterId: reporter._id, reportedId: seller._id, targetKind: 'item', targetKey: `item:${listing._id}`, reportedListingId: listing._id, reason: 'Misleading information', description: 'The description does not match the photos.' });
app.use(cors({ origin: 'http://localhost:3001', credentials: true })); app.use(express.json());
for (const [path, routes] of [['admin', adminRoutes], ['reports', reportRoutes], ['messages', messageRoutes], ['auth', authRoutes], ['items', itemRoutes], ['accommodations', accommodationRoutes]]) app.use(`/api/${path}`, routes);
fs.writeFileSync('/private/tmp/unimarket-preview-access.json', JSON.stringify({ admin: { id: admin._id, token: jwt.sign({ userId: admin._id }, process.env.JWT_SECRET) }, seller: { id: seller._id, token: jwt.sign({ userId: seller._id }, process.env.JWT_SECRET) }, reporter: { id: reporter._id, token: jwt.sign({ userId: reporter._id }, process.env.JWT_SECRET) }, reportId: report._id, listingId: listing._id, accommodationId: accommodation._id }), { mode: 0o600 });
startChatAlertWorker();
server.listen(8001, '127.0.0.1', () => console.log('Isolated browser preview API ready on port 8001'));
