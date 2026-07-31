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

    res.status(200).json({
      token,
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const verifyEmail = async (req, res) => {
  const incomingToken = req.params.token;
  let saveCompleted = false;

  logVerificationStep("request received", { incomingToken });

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
      verificationTokenBeforeClearing: user.verificationToken,
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
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile picture missing" });
    }

    // Upload to Cloudinary
    const uploaded = await cloudinary.uploader.upload(profilePic, {
      folder: "profile_pictures",
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploaded.secure_url },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};

const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
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
  checkAuth,
  verifyEmail,
  resendVerificationEmail,
};
