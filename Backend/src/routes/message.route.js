import express from 'express';
import { ProtectRoute } from '../middleware/auth.middleware.js';
import { getMessage, getUsersForSidebar, sendMessage, markMessagesAsSeen, getUnreadCount } from '../controllers/message.controller.js';


const router = express.Router();

router.get("/users", ProtectRoute, getUsersForSidebar)
router.get("/unread/count", ProtectRoute, getUnreadCount)
router.get("/:id", ProtectRoute, getMessage)
router.post("/send/:id", ProtectRoute, sendMessage)
router.post("/seen/:id", ProtectRoute, markMessagesAsSeen)

export default router;