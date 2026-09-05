import express from 'express';
import { ProtectRoute } from '../middleware/auth.middleware.js';
import { getMessage, getUserForChat, getUsersForSidebar, sendMessage, markMessagesAsSeen, getUnreadCount, getBlockStatus, deleteChat, reportUser } from '../controllers/message.controller.js';


const router = express.Router();

router.get("/users", ProtectRoute, getUsersForSidebar)
router.get("/users/:id", ProtectRoute, getUserForChat)
router.get("/unread/count", ProtectRoute, getUnreadCount)
router.get("/safety/:id", ProtectRoute, getBlockStatus)
router.post("/report/:id", ProtectRoute, reportUser)
router.delete("/:id", ProtectRoute, deleteChat)
router.get("/:id", ProtectRoute, getMessage)
router.post("/send/:id", ProtectRoute, sendMessage)
router.post("/seen/:id", ProtectRoute, markMessagesAsSeen)

export default router;
