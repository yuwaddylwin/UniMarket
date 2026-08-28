import express from "express";
import {
  createAccommodation,
  getAccommodations,
  getAccommodationById,
  getMyAccommodations,
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
router.get("/:id", getAccommodationById);
router.post("/", ProtectRoute, uploadAccommodationImages, createAccommodation);

export default router;
