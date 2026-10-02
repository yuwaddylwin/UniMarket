import mongoose from "mongoose";

export function hasValidId(id) {
  return mongoose.isObjectIdOrHexString(id);
}

export function sendControllerError(res, error, fallback) {
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ message: error.message || fallback });
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
}

export function parseMaybeJson(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Retain a display snapshot for older listings whose owner is no longer populated.
// Items and accommodation intentionally use different fallback names.
export function buildSellerSnapshot(user, fallbackName = "Seller") {
  if (!user) return undefined;
  return {
    id: user._id,
    username: user.username || "",
    fullName:
      user.fullName || user.name || user.username || user.email || fallbackName,
    profilePic: user.profilePic || user.avatar || user.photo || "",
  };
}
