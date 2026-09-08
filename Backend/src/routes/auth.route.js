import { signup, login, resendVerificationEmail, usernameAvailability, verifyCode, forgotPassword, resetPassword } from '../controllers/authFlow.controller.js';
import { googleConfig, googleStart, googleCallback, googlePending, googleComplete, googleResend } from '../controllers/googleAuth.controller.js';
import { rateLimit } from '../services/authSecurity.js';
import express from "express";
import {
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
} from "../controllers/auth.controller.js";
import { ProtectRoute } from "../middleware/auth.middleware.js";
const router = express.Router();
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

router.get('/username', rateLimit(90), usernameAvailability);
router.get('/google/config', googleConfig);
router.get('/google', rateLimit(), googleStart);
router.get('/google/callback', rateLimit(), googleCallback);
router.get('/google/pending', rateLimit(60), googlePending);
router.post('/google/complete', rateLimit(), googleComplete);
router.post('/google/resend', rateLimit(5), googleResend);
router.post('/verify-code', rateLimit(), verifyCode);
router.post('/forgot-password', rateLimit(5), forgotPassword);
router.post('/reset-password', rateLimit(), resetPassword);
router.post("/signup", rateLimit(10), signup);

router.post("/login", rateLimit(20, 15, true), login);

router.get("/verify/:token", rateLimit(), verifyEmail);

router.post("/resend-verification", rateLimit(5), resendVerificationEmail);

router.post("/logout", ProtectRoute, logout);

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
