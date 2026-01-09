import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  createItem,
  getItems,
  getItemById,
  getMyItems,
} from "../controllers/items.controller.js";

const router = express.Router();

// IMPORTANT: /mine must be BEFORE /:id
router.get("/", getItems);
router.get("/mine", ProtectRoute, getMyItems);
router.get("/:id", getItemById);

router.post("/", ProtectRoute, createItem);

export default router;
