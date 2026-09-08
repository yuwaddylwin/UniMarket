import { cookieOptions } from '../services/authSecurity.js';
import { accountStatus } from '../services/moderationPolicy.js';
import { withChatTransaction, chatError, blockState } from "../services/chatSafety.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/user.model.js";

const PROFILE_IMAGE_PATTERN = /^data:image\/(?:avif|gif|jpe?g|png|webp);base64,/i;
const MAX_PROFILE_IMAGE_DATA_LENGTH = 7 * 1024 * 1024;

const getCloudinaryPublicIdFromUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.includes("res.cloudinary.com")) {
    return "";
  }

  try {
    const pathAfterUpload = new URL(imageUrl).pathname.split("/upload/")[1];
    if (!pathAfterUpload) return "";
    const segments = pathAfterUpload.split("/").filter(Boolean);
    if (/^v\d+$/.test(segments[0] || "")) segments.shift();
    if (!segments.length) return "";
    const publicId = decodeURIComponent(segments.join("/")).replace(/\.[^.\/]+$/, "");
    return publicId.startsWith("profile_pictures/") ? publicId : "";
  } catch {
    return "";
  }
};

const destroyProfileImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
};

export const serializePublicUser = (user) => ({
  _id: user._id,
  role: user.role || "user",
  accountStatus: accountStatus(user),
  restriction: user.restriction,
  fullName: user.fullName,
  username: user.username || "",
  email: user.email,
  profilePic: user.profilePic || "",
  preferences: {
    browserPush: user.preferences?.browserPush === true,
    language: user.preferences?.language || "en",
    messages: user.preferences?.messages !== false,
  },
  verified: user.verified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Preserve outstanding legacy links; atomically consume each link once.
const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ verificationToken: req.params.token, verificationTokenExpires: { $gt: new Date() }, verified: false }, { $set: { verified: true, verificationToken: null, verificationTokenExpires: null } });
    if (!user) return res.status(400).json({ success: false, message: 'Verification link is invalid or expired.' });
    return res.json({ success: true, message: 'Email verified successfully.' });
  } catch {
    return res.status(500).json({ success: false, message: 'Unable to verify your email right now. Please try again.' });
  }
};

const logout = async (req, res) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { sessionVersion: 1 } });
    io.in(getReceiverSocketId(String(req.user._id))).disconnectSockets(true);
    res.clearCookie('jwt', cookieOptions());
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: "Unable to sign out. Please try again." });
  }
};

const updateProfile = async (req, res) => {
  let uploadedPublicId = "";
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic || typeof profilePic !== "string") {
      return res.status(400).json({ message: "Profile picture missing" });
    }
    if (!PROFILE_IMAGE_PATTERN.test(profilePic)) {
      return res.status(400).json({ message: "Please upload a valid image file" });
    }
    if (profilePic.length > MAX_PROFILE_IMAGE_DATA_LENGTH) {
      return res.status(413).json({ message: "Profile picture must be 5 MB or smaller" });
    }

    const user = await User.findById(userId).select("+profilePicPublicId");
    if (!user) return res.status(404).json({ message: "User not found" });

    const previousPublicId =
      user.profilePicPublicId || getCloudinaryPublicIdFromUrl(user.profilePic);

    const uploaded = await cloudinary.uploader.upload(profilePic, {
      folder: "profile_pictures",
      resource_type: "image",
    });
    uploadedPublicId = uploaded.public_id;

    user.profilePic = uploaded.secure_url;
    user.profilePicPublicId = uploaded.public_id;
    await user.save();

    if (previousPublicId && previousPublicId !== uploaded.public_id) {
      await destroyProfileImage(previousPublicId).catch((error) => {
        console.error("Unable to remove previous profile picture:", error.message);
      });
    }

    return res.status(200).json(serializePublicUser(user));
  } catch (err) {
    if (uploadedPublicId) {
      await destroyProfileImage(uploadedPublicId).catch(() => {});
    }
    console.error("Error updating profile picture:", err.message);
    return res.status(500).json({ message: "Unable to update profile picture" });
  }
};

const updateProfileDetails = async (req, res) => {
  try {
    if ('username' in (req.body || {}) || 'email' in (req.body || {})) return res.status(400).json({ message: 'Username and email cannot be changed here.' });
    const fullName =
      typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";

    if (!fullName) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    if (fullName.length < 2 || fullName.length > 80) {
      return res.status(400).json({
        message: "Name must be between 2 and 80 characters",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.fullName = fullName;
    await user.save();

    return res.status(200).json(serializePublicUser(user));
  } catch (error) {
    console.error("Error updating profile details:", error.message);
    return res.status(500).json({ message: "Unable to update profile settings" });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const language = req.body?.language;
    const messages = req.body?.messages;

    if (!['en', 'th'].includes(language)) {
      return res.status(400).json({ message: "Language must be English or Thai" });
    }
    if (typeof messages !== "boolean") {
      return res.status(400).json({ message: "Message alert preference must be true or false" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { browserPush = user.preferences?.browserPush === true } = req.body;
    if (typeof browserPush !== "boolean") return res.status(400).json({ message: "Invalid message alert preference" });
    user.preferences = { language, messages, browserPush };
    await user.save();
    return res.status(200).json(serializePublicUser(user));
  } catch (error) {
    console.error("Error updating preferences:", error.message);
    return res.status(500).json({ message: "Unable to update preferences" });
  }
};

const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("blockedUsers", "fullName username profilePic")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user.blockedUsers || []);
  } catch (error) {
    console.error("Error fetching blocked users:", error.message);
    return res.status(500).json({ message: "Unable to load blocked users" });
  }
};

const changeBlock = (blocked) => async (req, res) => {
  const other = req.params.userId;
  try {
    const safety = await withChatTransaction(req.user._id, other, async (session, me, partner) => {
      const updated = await User.findOneAndUpdate({ _id: req.user._id }, blocked
        ? { $addToSet: { blockedUsers: other } }
        : { $pull: { blockedUsers: other } }, { session, new: true });
      return blockState(updated, partner);
    });
    for (const id of [String(req.user._id), other]) {
      io.to(getReceiverSocketId(id)).emit('blockChanged', { userId: id === other ? String(req.user._id) : other });
    }
    res.json({ message: blocked ? 'User blocked' : 'User unblocked', id: other, ...safety });
  } catch (error) { chatError(res, error); }
};
const blockUser = changeBlock(true);
const unblockUser = changeBlock(false);

const removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+profilePicPublicId");
    if (!user) return res.status(404).json({ message: "User not found" });

    const previousPublicId =
      user.profilePicPublicId || getCloudinaryPublicIdFromUrl(user.profilePic);

    user.profilePic = "";
    user.profilePicPublicId = "";
    await user.save();

    await destroyProfileImage(previousPublicId).catch((error) => {
      console.error("Unable to remove profile picture from storage:", error.message);
    });

    return res.status(200).json(serializePublicUser(user));
  } catch (error) {
    console.error("Error removing profile picture:", error.message);
    return res.status(500).json({ message: "Unable to remove profile picture" });
  }
};

const checkAuth = (req, res) => {
  try {
    res.status(200).json(serializePublicUser(req.user));
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export {
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
};
