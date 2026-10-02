import { ECDH, timingSafeEqual } from "node:crypto";
import express from "express";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import { PushSubscription } from "../models/chatAlert.model.js";
import { endpoint } from "../services/apiValidation.js";
import { fail } from "../services/chatSafety.js";
import { pushConfigured } from "../services/chatAlerts.js";
export function validateSubscription(body) {
  let url;
  try {
    url = new URL(body?.endpoint);
  } catch {
    fail(400, "Invalid push subscription");
  }
  // Only known push services are allowed: endpoints cannot target local/internal servers.
  const allowed =
    /^(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*notify\.windows\.com)$/i;
  if (
    url.protocol !== "https:" ||
    !allowed.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    body.endpoint.length > 2048
  )
    fail(400, "Unsupported push service");
  for (const [key, length] of [
    ["p256dh", 65],
    ["auth", 16],
  ]) {
    const value = body.keys?.[key];
    if (
      typeof value !== "string" ||
      !/^[\w-]+={0,2}$/.test(value) ||
      Buffer.from(value, "base64url").length !== length
    )
      fail(400, "Invalid push credentials");
  }
  try {
    ECDH.convertKey(Buffer.from(body.keys.p256dh, "base64url"), "prime256v1");
  } catch {
    fail(400, "Invalid push public key");
  }
  return {
    endpoint: url.href,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  };
}
const router = express.Router();
router.use(ProtectRoute, (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
router.get("/config", (req, res) =>
  res.json({
    enabled: pushConfigured(),
    publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null,
  })
);
router.post(
  "/subscriptions",
  endpoint(async (req, res) => {
    if (!pushConfigured())
      fail(
        503,
        "Browser message alerts are not configured yet. Chat badges remain available."
      );
    const subscription = validateSubscription(req.body);
    const existing = await PushSubscription.findOne({
      endpoint: subscription.endpoint,
    }).select("userId +keys.p256dh +keys.auth");
    if (existing && String(existing.userId) !== String(req.user._id)) {
      for (const key of ["p256dh", "auth"]) {
        const before = Buffer.from(existing.keys[key], "base64url"),
          after = Buffer.from(subscription.keys[key], "base64url");
        if (before.length !== after.length || !timingSafeEqual(before, after))
          fail(409, "Unsubscribe and register this browser again.");
      }
    }
    if (
      !existing &&
      (await PushSubscription.countDocuments({ userId: req.user._id })) >= 20
    )
      fail(409, "Too many registered devices. Remove an old device first.");
    await PushSubscription.updateOne(
      { endpoint: subscription.endpoint },
      { $set: { ...subscription, userId: req.user._id } },
      { upsert: true, runValidators: true }
    );
    res.status(201).json({ message: "This browser is registered" });
  })
);
router.delete(
  "/subscriptions",
  endpoint(async (req, res) => {
    if (
      typeof req.body.endpoint !== "string" ||
      req.body.endpoint.length > 2048
    )
      fail(400, "Invalid subscription");
    await PushSubscription.deleteOne({
      userId: req.user._id,
      endpoint: req.body.endpoint,
    });
    res.json({ message: "This browser is unregistered" });
  })
);
export default router;
