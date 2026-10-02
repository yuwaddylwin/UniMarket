import { requireActive } from "../services/moderationPolicy.js";
import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import {
  createItem,
  getItems,
  getItemById,
  getMyItems,
  getMyArchivedItems,
  updateItemStatus,
  updateItem,
  deleteItem,
} from "../controllers/items.controller.js";

const router = express.Router();

const uploadItemImages = (req, res, next) => {
  upload.array("images", 6)(req, res, (error) => {
    if (!error) return next();

    return res.status(400).json({
      success: false,
      message: error.message || "Image upload failed",
    });
  });
};

router.get("/", getItems);
router.get("/mine", ProtectRoute, getMyItems);
router.get("/mine/archive", ProtectRoute, getMyArchivedItems);
router.get("/:id", getItemById);

router.post("/", ProtectRoute, requireActive, uploadItemImages, createItem);
router.put("/:id", ProtectRoute, requireActive, uploadItemImages, updateItem);
router.patch("/:id/status", ProtectRoute, requireActive, updateItemStatus);

router.delete("/:id", ProtectRoute, requireActive, deleteItem);

export default router;
