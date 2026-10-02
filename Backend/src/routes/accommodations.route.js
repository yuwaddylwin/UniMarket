import { requireActive } from "../services/moderationPolicy.js";
import express from "express";
import {
  createAccommodation,
  deleteAccommodation,
  getAccommodations,
  getAccommodationById,
  getMyAccommodations,
  getMyArchivedAccommodations,
  updateAccommodationStatus,
  updateAccommodation,
} from "../controllers/accommodations.controller.js";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

const uploadAccommodationImages = (req, res, next) => {
  upload.array("images", 6)(req, res, (error) => {
    if (!error) return next();
    return res.status(400).json({
      success: false,
      message: error.message || "Image upload failed",
    });
  });
};

router.get("/", getAccommodations);
router.get("/mine", ProtectRoute, getMyAccommodations);
router.get("/mine/archive", ProtectRoute, getMyArchivedAccommodations);
router.get("/:id", getAccommodationById);
router.post(
  "/",
  ProtectRoute,
  requireActive,
  uploadAccommodationImages,
  createAccommodation
);
router.put(
  "/:id",
  ProtectRoute,
  requireActive,
  uploadAccommodationImages,
  updateAccommodation
);
router.patch(
  "/:id/status",
  ProtectRoute,
  requireActive,
  updateAccommodationStatus
);
router.delete("/:id", ProtectRoute, requireActive, deleteAccommodation);

export default router;
