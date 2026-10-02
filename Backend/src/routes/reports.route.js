import express from "express";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Item from "../models/ItemsList.model.js";
import Accommodation from "../models/Accommodation.model.js";
import Message from "../models/message.model.js";
import Report, { reportReasons } from "../models/report.model.js";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  assertActive,
  requireActive,
  visibleListing,
} from "../services/moderationPolicy.js";
import { id, text, choice, endpoint } from "../services/apiValidation.js";
import { fail, pairFilter, conversationId } from "../services/chatSafety.js";
export const createReport = endpoint(async (req, res) => {
  const kind = choice(
    req.body.targetKind,
    ["user", "item", "accommodation", "message"],
    "report target"
  );
  const targetId = id(req.body.targetId);
  const reason = choice(req.body.reason, reportReasons, "report reason");
  const description = text(req.body.description, "additional details");
  const report = await mongoose.connection.transaction(async (session) => {
    const reporter = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $inc: { chatRevision: 1 } },
      { new: true, session }
    );
    assertActive(reporter);
    if (
      (await Report.countDocuments({
        reporterId: reporter._id,
        createdAt: { $gte: new Date(Date.now() - 3600000) },
      }).session(session)) >= 5
    )
      fail(
        429,
        "You can submit up to five reports per hour. Please try again later."
      );
    let reportedId, reportedListingId, reportedMessageId, conversation;
    if (kind === "user") {
      const target = await User.findById(targetId).session(session);
      if (!target) fail(404, "User not found");
      reportedId = target._id;
      if (
        await Message.exists(pairFilter(reporter._id, targetId)).session(
          session
        )
      )
        conversation = conversationId(reporter._id, targetId);
    } else if (kind === "message") {
      const message = await Message.findById(targetId).session(session);
      if (!message || String(message.receivedId) !== String(reporter._id))
        fail(404, "Message not found");
      reportedId = message.senderId;
      reportedMessageId = message._id;
      conversation = conversationId(reporter._id, reportedId);
    } else {
      const listing = await (kind === "item" ? Item : Accommodation)
        .findOne({ _id: targetId, ...visibleListing })
        .session(session);
      if (!listing) fail(404, "Listing not found");
      reportedId = listing.user;
      reportedListingId = listing._id;
    }
    if (String(reportedId) === String(reporter._id))
      fail(400, "You cannot report yourself or your own content");
    const [created] = await Report.create(
      [
        {
          reporterId: reporter._id,
          reportedId,
          targetKind: kind,
          targetKey: `${kind}:${targetId}`,
          reportedListingId,
          reportedMessageId,
          conversationId: conversation,
          reason,
          description,
        },
      ],
      { session }
    );
    return created;
  });
  res.status(201).json({
    id: report._id,
    status: report.status,
    message: "Report submitted. Our moderation team will review it.",
  });
});
const router = express.Router();
router.use(ProtectRoute);
router.get("/reasons", (req, res) => res.json(reportReasons));
router.post("/", requireActive, createReport);
export default router;
