import crypto from "node:crypto";
import { logEmailFailure } from "../services/emailErrors.js";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { sendAuthCode } from "../utils/email.js";
import { serializePublicUser } from "./auth.controller.js";
import {
  normalize,
  validUsername,
  validPassword,
  digest,
  Challenge,
  establishSession,
} from "../services/authSecurity.js";
const validEmail = (email) =>
  email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const safeAuth = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({
        message: error.keyPattern?.username
          ? "Username is already taken."
          : "An account with that email already exists.",
      });
    res.status(error.status || 500).json({
      message: error.publicMessage || "Something went wrong. Please try again.",
      ...(error.publicCode ? { code: error.publicCode } : {}),
    });
  }
};
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status, publicMessage: message });
}
export async function issueCode(email, purpose) {
  const id = `${purpose}:${email}`;
  const code = String(crypto.randomInt(100000, 1000000));
  const linkToken = purpose === "verify" ? crypto.randomBytes(32).toString("hex") : "";
  const now = new Date();
  let previous;
  try {
    previous = await Challenge.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { sentAt: { $lte: new Date(Date.now() - 60000) } },
          { sentAt: { $exists: false } },
        ],
      },
      {
        $set: {
          hash: digest(`${id}:${code}`),
          linkHash: linkToken ? digest(linkToken) : null,
          attempts: 0,
          sentAt: now,
          expires: new Date(Date.now() + 600000),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    if (error.code === 11000)
      fail("Please wait 60 seconds before requesting another code.", 429);
    throw error;
  }
  try {
    await sendAuthCode(email, code, purpose, linkToken);
  } catch (error) {
    const failure = logEmailFailure(error);
    if (previous)
      await Challenge.updateOne(
        { _id: id, sentAt: now },
        {
          $set: {
            hash: previous.hash,
            linkHash: previous.linkHash || null,
            attempts: previous.attempts,
            sentAt: previous.sentAt,
            expires: previous.expires,
          },
        }
      );
    else await Challenge.deleteOne({ _id: id, sentAt: now });
    throw Object.assign(new Error("Email delivery failed"), {
      status: failure.status,
      publicCode: "EMAIL_DELIVERY_FAILED",
      publicMessage: "We could not send your code. Please try again later. If this continues, contact support.",
    });
  }
}
export async function consumeCode(email, purpose, code) {
  const id = `${purpose}:${email}`;
  if (typeof code !== "string" || !/^\d{6}$/.test(code))
    fail("Enter the 6-digit code.");
  const challenge = await Challenge.findOneAndUpdate(
    { _id: id, expires: { $gt: new Date() }, attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (!challenge)
    fail(
      "The verification code has expired or too many attempts were made. Request a new code."
    );
  if (challenge.hash !== digest(`${id}:${code}`))
    fail("Incorrect verification code.");
  const consumed = await Challenge.deleteOne({ _id: id, hash: challenge.hash });
  if (!consumed.deletedCount) fail("This code has already been used.");
}
export const usernameAvailability = safeAuth(async (req, res) => {
  const username = normalize(req.query.username);
  if (!validUsername(username))
    return res.json({
      available: false,
      message: "Use 3–30 letters, numbers, or underscores.",
    });
  const available = !(await User.exists({ username }));
  res.json({
    available,
    message: available ? "Username available" : "Username is already taken.",
  });
});
export const signup = safeAuth(async (req, res) => {
  const { password } = req.body || {};
  const email = normalize(req.body?.email),
    username = normalize(req.body?.username);
  const fullName =
    typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
  if (fullName.length < 2 || fullName.length > 80)
    fail("Name must be between 2 and 80 characters.");
  if (!validUsername(username))
    fail("Username must use 3–30 letters, numbers, or underscores.");
  if (!validEmail(email)) fail("Please enter a valid email address.");
  if (!validPassword(password))
    fail("Password must be at least 8 characters and at most 72 bytes.");
  if (await User.exists({ username })) fail("Username is already taken.", 409);
  if (await User.exists({ email }))
    fail(
      "An account with that email already exists. Sign in or resend verification.",
      409
    );
  await User.create({
    fullName,
    username,
    email,
    password: await bcrypt.hash(password, 12),
  });
  await issueCode(email, "verify");
  res
    .status(201)
    .json({ message: "Enter the 6-digit code we sent to your email." });
});
export const login = safeAuth(async (req, res) => {
  const identifier = normalize(req.body?.identifier ?? req.body?.email),
    password = req.body?.password;
  if (
    !identifier ||
    typeof password !== "string" ||
    Buffer.byteLength(password) > 72
  )
    fail("Incorrect username/email or password.");
  const user = await User.findOne(
    identifier.includes("@") ? { email: identifier } : { username: identifier }
  ).select("+password +sessionVersion");
  // Equal-cost hashing for unknown or passwordless accounts reduces timing enumeration.
  const hash =
    user?.password ||
    "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
  if (!(await bcrypt.compare(password, hash)) || !user?.password)
    fail("Incorrect username/email or password.", 401);
  if (!user.verified)
    return res.status(401).json({
      message: "Please verify your email before logging in.",
      code: "EMAIL_UNVERIFIED",
      email: user.email,
    });
  establishSession(res, user);
  res.json(serializePublicUser(user));
});
export const resendVerificationEmail = safeAuth(async (req, res) => {
  const email = normalize(req.body?.email);
  if (!validEmail(email)) fail("Please enter a valid email address.");
  if (await User.exists({ email, verified: false }))
    await issueCode(email, "verify");
  res.json({
    message: "If your account needs verification, a code has been sent.",
  });
});
export const verifyCode = safeAuth(async (req, res) => {
  const email = normalize(req.body?.email);
  await consumeCode(email, "verify", req.body?.code);
  const user = await User.findOneAndUpdate(
    { email, verified: false },
    {
      $set: {
        verified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    },
    { new: true }
  ).select("+sessionVersion");
  if (!user) fail("Account is already verified. Please sign in.");
  establishSession(res, user);
  res.json(serializePublicUser(user));
});
export const forgotPassword = safeAuth(async (req, res) => {
  const email = normalize(req.body?.email);
  if (!validEmail(email)) fail("Please enter a valid email address.");
  if (await User.exists({ email, verified: true }))
    await issueCode(email, "reset");
  res.json({
    message:
      "If a verified account exists, a password reset code has been sent.",
  });
});
export const resetPassword = safeAuth(async (req, res) => {
  const email = normalize(req.body?.email),
    password = req.body?.password;
  if (!validPassword(password))
    fail("Password must be at least 8 characters and at most 72 bytes.");
  await consumeCode(email, "reset", req.body?.code);
  const user = await User.findOneAndUpdate(
    { email, verified: true },
    {
      $set: { password: await bcrypt.hash(password, 12) },
      $inc: { sessionVersion: 1 },
    }
  );
  if (!user) fail("Unable to reset this account.");
  const { io, getReceiverSocketId } = await import("../lib/socket.js");
  io.in(getReceiverSocketId(String(user._id))).disconnectSockets(true);
  res.json({ message: "Password updated. Please sign in." });
});
