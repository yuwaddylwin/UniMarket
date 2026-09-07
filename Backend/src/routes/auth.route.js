import express from "express";
import {
  signup,
  login,
  logout,
  updateProfile,
  updateProfileDetails,
  updatePreferences,
  getBlockedUsers,
  blockUser,
  unblockUser,
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
router.patch("/profile", ProtectRoute, updateProfileDetails);
router.patch("/preferences", ProtectRoute, updatePreferences);
router.get("/blocked-users", ProtectRoute, getBlockedUsers);
router.post("/blocked-users/:userId", ProtectRoute, blockUser);
router.delete("/blocked-users/:userId", ProtectRoute, unblockUser);
router.delete("/profile-photo", ProtectRoute, removeProfilePhoto);

router.get("/check", ProtectRoute, checkAuth);

router.get("/me", ProtectRoute, checkAuth);


export default router;
