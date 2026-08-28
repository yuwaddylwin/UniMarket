import express from "express";
import {
  signup,
  login,
  logout,
  updateProfile,
  removeProfilePhoto,
  checkAuth,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/auth.controller.js";
import { ProtectRoute } from "../middleware/auth.middleware.js";
const router = express.Router();

router.post("/signup", signup);

router.post("/login", login);

router.get("/verify/:token", verifyEmail);

router.post("/resend-verification", resendVerificationEmail);

router.post("/logout", logout);

router.post("/update-profile", ProtectRoute, updateProfile);
router.delete("/profile-photo", ProtectRoute, removeProfilePhoto);

router.get("/check", ProtectRoute, checkAuth);

// new route
router.get("/me", ProtectRoute, (req, res) => {
  // return only what frontend needs
  res.json({
    _id: req.user._id,
    fullName: req.user.fullName,
    profilePic: req.user.profilePic,
    email: req.user.email,
  });
});


export default router;
