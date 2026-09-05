import { withChatTransaction, chatError, blockState } from "../services/chatSafety.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { sendVerificationEmail } from "../utils/email.js";

const VERIFICATION_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000;
const REGISTRATION_SUCCESS_MESSAGE =
  "Registration successful. Please verify your email before logging in.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

const serializePublicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  username: user.username || "",
  email: user.email,
  profilePic: user.profilePic || "",
  preferences: {
    language: user.preferences?.language || "en",
    messages: user.preferences?.messages !== false,
    notifications: user.preferences?.notifications !== false,
  },
  verified: user.verified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const logVerificationStep = (step, details = {}) => {
  console.log("[email-verification]", step, details);
};

const sendVerificationResponse = (res, status, body) => {
  logVerificationStep("response", { status, body });
  return res.status(status).json(body);
};

const createVerificationCredentials = () => ({
  verificationToken: uuidv4(),
  verificationTokenExpires: new Date(
    Date.now() + VERIFICATION_TOKEN_LIFETIME_MS
  ),
});

// Express handler async/await
const signup = async (req, res) => {
  try {
    const { fullName: rawFullName, email: rawEmail, password } = req.body ?? {};
    const fullName =
      typeof rawFullName === "string" ? rawFullName.trim() : rawFullName;
    const email =
      typeof rawEmail === "string"
        ? rawEmail.trim().toLowerCase()
        : rawEmail;

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !fullName ||
      !email ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verification = createVerificationCredentials();
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      verified: false,
      ...verification,
    });

    await newUser.save();

    try {
      await sendVerificationEmail(email, verification.verificationToken);
    } catch (emailError) {
      console.error("Verification email failed:", emailError.message);
      return res.status(502).json({
        message:
          "Your account was created, but the verification email could not be sent. Please try resending it.",
      });
    }

    res.status(201).json({
      message: REGISTRATION_SUCCESS_MESSAGE,
    });
  } catch (error) {
    console.error("Error in signup controller:", error.message);
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body ?? {};
    const email =
      typeof rawEmail === "string"
        ? rawEmail.trim().toLowerCase()
        : rawEmail;

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.verified) {
      return res
        .status(401)
        .json({ message: "Please verify your email before logging in." });
    }

    const token = generateToken(user._id);

    res.status(200).json({ token, ...serializePublicUser(user) });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const verifyEmail = async (req, res) => {
  const incomingToken = req.params.token;
  let saveCompleted = false;

  logVerificationStep("request received");

  try {
    const user = await User.findOne({
      verificationToken: incomingToken,
    }).select("+verificationToken +verificationTokenExpires");

    logVerificationStep("user lookup completed", {
      userFound: Boolean(user),
    });

    if (!user) {
      logVerificationStep("token validation", {
        tokenMatches: false,
        tokenExpired: null,
        verifiedBeforeUpdate: null,
        verificationTokenBeforeClearing: null,
      });
      return sendVerificationResponse(res, 400, {
        success: false,
        message: "Verification link is invalid or expired.",
      });
    }

    const tokenMatches = user.verificationToken === incomingToken;
    const tokenExpired =
      !user.verificationTokenExpires ||
      user.verificationTokenExpires.getTime() <= Date.now();

    logVerificationStep("token validation", {
      tokenMatches,
      tokenExpired,
      verifiedBeforeUpdate: user.verified,
    });

    if (!tokenMatches || tokenExpired) {
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      await user.save();
      saveCompleted = true;
      logVerificationStep("expired token cleared", {
        verifiedAfterUpdate: user.verified,
        verificationTokenAfterClearing: user.verificationToken,
      });
      return sendVerificationResponse(res, 400, {
        success: false,
        message: "Verification link is invalid or expired.",
      });
    }

    user.verified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    logVerificationStep("user prepared for save", {
      verifiedAfterUpdate: user.verified,
      verificationTokenAfterClearing: user.verificationToken,
    });

    await user.save();
    saveCompleted = true;

    logVerificationStep("user save completed", {
      saveCompleted,
      verifiedAfterUpdate: user.verified,
      verificationTokenAfterClearing: user.verificationToken,
    });

    return sendVerificationResponse(res, 200, {
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("[email-verification] controller error", {
      message: error.message,
      stack: error.stack,
      saveCompleted,
      headersSent: res.headersSent,
    });

    // Never attempt a second response if an error occurs after headers were sent.
    if (res.headersSent) return;

    return sendVerificationResponse(res, 500, {
      success: false,
      message: "Unable to verify your email right now. Please try again.",
    });
  }
};

const resendVerificationEmail = async (req, res) => {
  const rawEmail = req.body?.email;
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  try {
    const user = await User.findOne({ email }).select(
      "+verificationToken +verificationTokenExpires"
    );

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    if (user.verified) {
      return res.status(200).json({ message: "Email already verified." });
    }

    const previousToken = user.verificationToken;
    const previousExpiry = user.verificationTokenExpires;
    const verification = createVerificationCredentials();
    user.verificationToken = verification.verificationToken;
    user.verificationTokenExpires = verification.verificationTokenExpires;
    await user.save();

    try {
      await sendVerificationEmail(email, verification.verificationToken);
    } catch (emailError) {
      // Keep the previous link usable when delivery of the replacement fails.
      user.verificationToken = previousToken;
      user.verificationTokenExpires = previousExpiry;
      await user.save();
      console.error("Verification email resend failed:", emailError.message);
      return res.status(502).json({
        message:
          "We could not send the verification email right now. Please try again later.",
      });
    }

    return res.status(200).json({
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Error in resend verification controller:", error.message);
    return res.status(500).json({
      message: "Unable to resend the verification email right now.",
    });
  }
};

const logout = (req, res) => {
  try {
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
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
    const notifications = req.body?.notifications;

    if (!['en', 'th'].includes(language)) {
      return res.status(400).json({ message: "Language must be English or Thai" });
    }
    if (typeof messages !== "boolean" || typeof notifications !== "boolean") {
      return res.status(400).json({ message: "Notification preferences must be true or false" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.preferences = { language, messages, notifications };
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
};
