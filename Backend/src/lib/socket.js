import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://unimarket-web.onrender.com",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  },
});

export function getReceiverSocketId(userId) { return `user:${userId}`; }
const online = new Map();
io.use(async (socket, next) => {
  try {
    const cookie = socket.handshake.headers.cookie?.split('; ').find(c => c.startsWith('jwt='))?.slice(4);
    const decoded = jwt.verify(socket.handshake.auth?.token || cookie, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('verified');
    if (!user?.verified) return next(new Error('Unauthorized'));
    socket.data.userId = String(user._id);
    next();
  } catch { next(new Error('Unauthorized')); }
});
io.on('connection', socket => {
  const id = socket.data.userId;
  socket.join(getReceiverSocketId(id));
  online.set(id, (online.get(id) || 0) + 1);
  io.emit('getOnlineUsers', [...online.keys()]);
  socket.on('chat:activity', active => { socket.data.chatActiveUntil = active === true ? Date.now() + 45000 : 0; });
  socket.on('disconnect', () => {
    const count = online.get(id) - 1;
    if (count) online.set(id, count); else online.delete(id);
    io.emit('getOnlineUsers', [...online.keys()]);
  });
});
export { io, app, server };
