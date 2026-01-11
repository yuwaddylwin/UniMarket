import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import {
  createItem,
  getItems,
  getItemById,
  getMyItems,
  updateItem,
  deleteItem,
} from "../controllers/items.controller.js";

const router = express.Router();

router.get("/", getItems);
router.get("/mine", ProtectRoute, getMyItems);
router.get("/:id", getItemById);

router.post("/", ProtectRoute, upload.array("images", 6), createItem);
router.put("/:id", ProtectRoute, upload.array("images", 6), updateItem);

router.delete("/:id", ProtectRoute, deleteItem);

export default router;
