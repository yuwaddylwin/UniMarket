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
router.get("/:id", getItemById);

router.post("/", ProtectRoute, uploadItemImages, createItem);
router.put("/:id", ProtectRoute, uploadItemImages, updateItem);

router.delete("/:id", ProtectRoute, deleteItem);

export default router;
