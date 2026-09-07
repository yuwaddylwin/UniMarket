import chatPushRoutes from './chatPush.route.js';
import { markAllMessagesAsSeen } from '../controllers/message.controller.js';
import { requireActive } from '../services/moderationPolicy.js';
import express from 'express';
import { ProtectRoute } from '../middleware/auth.middleware.js';
import { getMessage, getUserForChat, getUsersForSidebar, sendMessage, markMessagesAsSeen, getUnreadCount, getBlockStatus, deleteChat, reportUser } from '../controllers/message.controller.js';


const router = express.Router();
router.use("/push", chatPushRoutes);
router.post("/seen-all", ProtectRoute, markAllMessagesAsSeen);

router.get("/users", ProtectRoute, getUsersForSidebar)
router.get("/users/:id", ProtectRoute, getUserForChat)
router.get("/unread/count", ProtectRoute, getUnreadCount)
router.get("/safety/:id", ProtectRoute, getBlockStatus)
router.post("/report/:id", ProtectRoute, requireActive, reportUser)
router.delete("/:id", ProtectRoute, requireActive, deleteChat)
router.get("/:id", ProtectRoute, getMessage)
router.post("/send/:id", ProtectRoute, requireActive, sendMessage)
router.post("/seen/:id", ProtectRoute, markMessagesAsSeen)

export default router;
