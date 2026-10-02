import mongoose from "mongoose";
import User from "../models/user.model.js";
import Report from "../models/report.model.js";
import { Restriction, ModerationAction } from "../models/moderation.model.js";

import { io, getReceiverSocketId } from "../lib/socket.js";
export async function migrateReports() {
  // Preserve legacy chat reports and replace only the obsolete pending-user index.
  await Report.collection.updateMany({ targetKey: { $exists: false } }, [
    {
      $set: {
        targetKind: "user",
        targetKey: { $concat: ["user:", { $toString: "$reportedId" }] },
        open: { $in: ["$status", ["pending", "reviewed", "under_review"]] },
      },
    },
  ]);
  const indexes = await Report.collection.indexes().catch((error) => {
    if (error.code === 26) return [];
    throw error;
  });
  for (const index of indexes)
    if (
      index.unique &&
      index.key.reporterId === 1 &&
      index.key.reportedId === 1 &&
      Object.keys(index.key).length === 2 &&
      index.partialFilterExpression?.status === "pending"
    )
      await Report.collection.dropIndex(index.name);
  // Older schemas allowed a reviewed and pending report for the same user.
  // Retain the newest unresolved record and retain older duplicates as closed
  // reports with an explicit migration note and an audit entry.
  let previousKey;
  const cursor = Report.find({ open: true })
    .sort({ reporterId: 1, targetKey: 1, createdAt: -1, _id: -1 })
    .select("reporterId targetKey reportedId")
    .cursor();
  for await (const report of cursor) {
    const key = `${report.reporterId}:${report.targetKey}`;
    if (key === previousKey)
      await mongoose.connection.transaction(async (session) => {
        const changed = await Report.updateOne(
          { _id: report._id, open: true },
          {
            $set: {
              open: false,
              status: "dismissed",
              resolvedAt: new Date(),
              adminNote:
                "Legacy duplicate: a newer unresolved report for the same target is retained.",
            },
          },
          { session }
        );
        if (changed.modifiedCount)
          await ModerationAction.create(
            [
              {
                action: "legacy_duplicate_closed",
                userId: report.reportedId,
                reportId: report._id,
                reason:
                  "Preserved legacy duplicate report while migrating unresolved-report uniqueness",
              },
            ],
            { session }
          );
      });
    previousKey = key;
  }
  await Report.createIndexes();
}
export async function expireFreezes() {
  const users = await User.find({
    "restriction.status": "frozen",
    "restriction.until": { $lte: new Date() },
  })
    .select("_id")
    .limit(50);
  for (const candidate of users) {
    const changed = await mongoose.connection.transaction(async (session) => {
      const user = await User.findOneAndUpdate(
        {
          _id: candidate._id,
          "restriction.status": "frozen",
          "restriction.until": { $lte: new Date() },
        },
        {
          $set: { restriction: { status: "active", reason: "" } },
          $inc: { chatRevision: 1 },
        },
        { session, new: true }
      );
      if (!user) return false;
      await Restriction.updateMany(
        { userId: user._id, kind: "frozen", endedAt: null },
        { $set: { endedAt: new Date() } },
        { session }
      );
      await ModerationAction.create(
        [
          {
            userId: user._id,
            action: "freeze_expired",
            reason: "Temporary account freeze expired automatically",
          },
        ],
        { session }
      );
      return true;
    });
    if (changed)
      io.to(getReceiverSocketId(candidate._id)).emit("accountModerated");
  }
}
export function startModerationMaintenance() {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await expireFreezes();
    } catch (error) {
      console.error("Account maintenance will retry:", error.name);
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(tick, 30000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
