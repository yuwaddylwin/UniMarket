import mongoose from "mongoose";
import User from "../models/user.model.js";
import Item from "../models/ItemsList.model.js";
import Accommodation from "../models/Accommodation.model.js";
import Report from "../models/report.model.js";
import {
  Warning,
  Restriction,
  ModerationAction,
} from "../models/moderation.model.js";
import { accountStatus } from "../services/moderationPolicy.js";
import { id, text, choice } from "../services/apiValidation.js";
import { fail } from "../services/chatSafety.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// One transaction records the action and restriction/history.
// Updating the user document also conflicts with concurrent chat sends/reports.
export async function recordModerationAction(req, res) {
  const action = choice(
    req.body.action,
    [
      "warn",
      "freeze",
      "unfreeze",
      "suspend",
      "restore_account",
      "hide",
      "remove",
      "under_review",
      "restore_listing",
      "review_report",
      "resolve_report",
      "dismiss_report",
    ],
    "action"
  );
  const reason = text(req.body.reason, "a reason", true),
    adminNote = text(req.body.adminNote, "an admin note");
  const targetId = id(req.body.targetId);
  let affectedUser;
  await mongoose.connection.transaction(async (session) => {
    // Re-read authorization inside the write transaction as well.
    const admin = await User.findOneAndUpdate(
      { _id: req.user._id, role: "admin" },
      { $inc: { chatRevision: 1 } },
      { session, new: true }
    );
    if (!admin || ["frozen", "suspended"].includes(accountStatus(admin)))
      fail(403, "Administrator access required");
    let userId, listingId, listingType, reportId;
    if (
      ["review_report", "resolve_report", "dismiss_report"].includes(action)
    ) {
      const report = await Report.findById(targetId).session(session);
      if (!report) fail(404, "Report not found");
      const status = {
        review_report: "under_review",
        resolve_report: "resolved",
        dismiss_report: "dismissed",
      }[action];
      if (["resolved", "dismissed"].includes(report.status))
        fail(409, "This report is already closed");
      if (report.status === status)
        fail(409, "This report is already under review");
      report.status = status;
      report.open = status === "under_review";
      report.adminNote = adminNote || reason;
      if (!report.open) {
        report.resolvedAt = new Date();
        report.resolvedBy = admin._id;
      }
      await report.save({ session });
      reportId = report._id;
      userId = report.reportedId;
    } else if (
      ["hide", "remove", "under_review", "restore_listing"].includes(action)
    ) {
      listingType = choice(
        req.body.listingType,
        ["item", "accommodation"],
        "listing type"
      );
      const listing = await (listingType === "item" ? Item : Accommodation)
        .findById(targetId)
        .session(session);
      if (!listing) fail(404, "Listing not found");
      const status = {
        hide: "hidden",
        remove: "removed",
        under_review: "under_review",
        restore_listing: "active",
      }[action];
      if ((listing.moderationStatus || "active") === status)
        fail(409, `Listing is already ${status.replace("_", " ")}`);
      const owner = await User.findById(listing.user).session(session);
      if (owner?.role === "admin" || String(listing.user) === String(admin._id))
        fail(
          403,
          "Administrators cannot moderate their own or another administrator’s content"
        );
      listing.moderationStatus = status;
      listing.moderationReason = reason;
      listing.moderatedAt = new Date();
      listing.moderatedBy = admin._id;
      await listing.save({ session });
      userId = listing.user;
      listingId = listing._id;
    } else {
      const user = await User.findById(targetId).session(session);
      if (!user) fail(404, "User not found");
      if (user.role === "admin" || String(user._id) === String(admin._id))
        fail(
          403,
          "Administrators cannot moderate themselves or another administrator"
        );
      userId = user._id;
      if (action === "warn") {
        await Warning.create(
          [{ adminId: admin._id, userId, reason, adminNote }],
          { session }
        );
        user.warningCount = (user.warningCount || 0) + 1;
      } else if (["freeze", "suspend"].includes(action)) {
        const status = action === "freeze" ? "frozen" : "suspended";
        if (["frozen", "suspended"].includes(accountStatus(user)))
          fail(
            409,
            "This account is already restricted. Restore it before applying a new restriction."
          );
        let until;
        if (action === "freeze") {
          until = new Date(req.body.until);
          const duration = until.getTime() - Date.now();
          if (
            !Number.isFinite(duration) ||
            duration < 60000 ||
            duration > 366 * 86400000
          )
            fail(
              400,
              "Choose a freeze end time between one minute and one year from now"
            );
        }
        await Restriction.create(
          [
            {
              adminId: admin._id,
              userId,
              kind: status,
              until,
              reason,
              adminNote,
            },
          ],
          { session }
        );
        user.restriction = { status, until, reason };
      } else {
        if (!["frozen", "suspended"].includes(accountStatus(user)))
          fail(409, "This account is not currently restricted");
        if (action === "unfreeze" && accountStatus(user) !== "frozen")
          fail(409, "Use Restore account for a suspended account");
        await Restriction.updateMany(
          { userId, endedAt: null },
          { $set: { endedAt: new Date(), endedBy: admin._id } },
          { session }
        );
        user.restriction = { status: "active", reason: "" };
      }
      await user.save({ session });
    }
    await ModerationAction.create(
      [
        {
          adminId: admin._id,
          action,
          userId,
          listingId,
          listingType,
          reportId,
          reason,
          adminNote,
        },
      ],
      { session }
    );
    affectedUser = userId;
  });
  if (affectedUser)
    io.to(getReceiverSocketId(affectedUser)).emit("accountModerated");
  res.json({ message: "Moderation action recorded" });
}
