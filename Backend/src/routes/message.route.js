import express from 'express';
import { ProtectRoute } from '../middleware/auth.middleware.js';
import { getMessage, getUsersForSidebar, sendMessage } from '../controllers/message.controller.js';


const router = express.Router();

router.get("/users", ProtectRoute, getUsersForSidebar)
router.get("/:id", ProtectRoute, getMessage)
router.post("/send/:id", ProtectRoute, sendMessage)

export default router;