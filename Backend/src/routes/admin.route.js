import express from "express";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Item from "../models/ItemsList.model.js";
import Accommodation from "../models/Accommodation.model.js";
import Report, { reportReasons } from "../models/report.model.js";
import Message from "../models/message.model.js";
import {
  Warning,
  Restriction,
  ModerationAction,
} from "../models/moderation.model.js";
import { ProtectRoute } from "../middleware/auth.middleware.js";
import {
  requireAdmin,
  accountStatus,
  publicUserFields,
} from "../services/moderationPolicy.js";
import {
  endpoint,
  id,
  text,
  choice,
  paging,
  search,
  dates,
} from "../services/apiValidation.js";
import { fail, pairFilter } from "../services/chatSafety.js";

import { recordModerationAction } from "../controllers/moderation.controller.js";
const router = express.Router();
router.use(ProtectRoute, requireAdmin, (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
const person = (value) =>
  value
    ? {
        ...(value.toObject ? value.toObject() : value),
        accountStatus: accountStatus(value),
      }
    : null;
const userPopulate = {
  path: "reporterId reportedId",
  select: publicUserFields,
};
async function list(Model, filter, req, populate) {
  const { page, limit, skip } = paging(req.query);
  let query = Model.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit);
  if (Model === User) query = query.select(publicUserFields);
  if (populate) query = query.populate(populate);
  const [rows, total] = await Promise.all([
    query,
    Model.countDocuments(filter),
  ]);
  return {
    rows: Model === User ? rows.map(person) : rows,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}
const frozenFilter = () => ({
  "restriction.status": "frozen",
  "restriction.until": { $gt: new Date() },
});
const activeFilter = () => ({
  $nor: [{ "restriction.status": "suspended" }, frozenFilter()],
});
router.get(
  "/dashboard",
  endpoint(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      frozenUsers,
      suspendedUsers,
      pendingReports,
      resolvedReports,
      reportedListings,
      warnings,
      recentActions,
      recentReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments(activeFilter()),
      User.countDocuments(frozenFilter()),
      User.countDocuments({ "restriction.status": "suspended" }),
      Report.countDocuments({
        status: { $in: ["pending", "reviewed", "under_review"] },
      }),
      Report.countDocuments({ status: "resolved" }),
      Report.aggregate([
        { $match: { open: true, reportedListingId: { $ne: null } } },
        { $group: { _id: "$reportedListingId" } },
        { $count: "total" },
      ]).then((rows) => rows[0]?.total || 0),
      Warning.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
      }),
      ModerationAction.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("adminId userId", "fullName username"),
      Report.find({ status: { $in: ["pending", "reviewed", "under_review"] } })
        .sort({ createdAt: -1 })
        .limit(8)
        .populate(userPopulate),
    ]);
    res.json({
      stats: {
        totalUsers,
        activeUsers,
        frozenUsers,
        suspendedUsers,
        pendingReports,
        resolvedReports,
        reportedListings,
        warnings,
      },
      recentActions,
      recentReports,
    });
  })
);
router.get(
  "/reports",
  endpoint(async (req, res) => {
    const filter = { ...dates(req.query) };
    if (req.query.status)
      filter.status = choice(
        req.query.status,
        ["pending", "under_review", "reviewed", "resolved", "dismissed"],
        "status"
      );
    if (req.query.reason)
      filter.reason = choice(req.query.reason, reportReasons, "reason");
    if (req.query.user) filter.reportedId = id(req.query.user);
    if (req.query.listing) filter.reportedListingId = id(req.query.listing);
    if (req.query.kind === "chat")
      filter.conversationId = { $exists: true, $nin: [null, ""] };
    else if (req.query.kind)
      filter.targetKind = choice(
        req.query.kind,
        ["user", "item", "accommodation", "message"],
        "kind"
      );
    if (req.query.q) {
      const pattern = search(req.query.q);
      filter.$or = [
        { reason: pattern },
        { description: pattern },
        ...(mongoose.isObjectIdOrHexString(req.query.q)
          ? [{ _id: req.query.q }]
          : []),
      ];
    }
    res.json(await list(Report, filter, req, userPopulate));
  })
);
router.get(
  "/reports/:id",
  endpoint(async (req, res) => {
    const report = await Report.findById(id(req.params.id)).populate(
      userPopulate
    );
    if (!report) fail(404, "Report not found");
    const userId = report.reportedId?._id;
    const listing = report.reportedListingId
      ? await (report.targetKind === "accommodation" ? Accommodation : Item)
          .findById(report.reportedListingId)
          .populate("user", publicUserFields)
      : null;
    let context = [];
    if (report.conversationId && report.reporterId && userId) {
      // Restrict review to the participants named in the report and messages at
      // or before submission. No arbitrary conversation lookup is exposed.
      const anchor =
        report.reportedMessageId &&
        (await Message.findOne({
          _id: report.reportedMessageId,
          ...pairFilter(report.reporterId._id, userId),
        }));
      context = await Message.find({
        ...pairFilter(report.reporterId._id, userId),
        createdAt: { $lte: anchor?.createdAt || report.createdAt },
      })
        .sort({ createdAt: -1, _id: -1 })
        .limit(12)
        .select("senderId receivedId text image createdAt");
      context.reverse();
    }
    const [reportsReceived, warnings, items, accommodations, history] =
      await Promise.all([
        Report.countDocuments({ reportedId: userId }),
        Warning.countDocuments({ userId }),
        Item.countDocuments({ user: userId }),
        Accommodation.countDocuments({ user: userId }),
        ModerationAction.find({ userId })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("adminId", "fullName"),
      ]);
    res.json({
      report: {
        ...report.toObject(),
        reporterId: person(report.reporterId),
        reportedId: person(report.reportedId),
      },
      listing,
      context,
      userStats: {
        reportsReceived,
        warnings,
        listings: items + accommodations,
      },
      history,
    });
  })
);
router.get(
  "/users",
  endpoint(async (req, res) => {
    const filter = {};
    if (req.query.q) {
      const pattern = search(req.query.q);
      filter.$or = [
        { fullName: pattern },
        { username: pattern },
        { email: pattern },
      ];
    }
    if (req.query.status) {
      choice(
        req.query.status,
        ["active", "warned", "frozen", "suspended", "restricted"],
        "account status"
      );
      const statusFilter =
        req.query.status === "active"
          ? activeFilter()
          : req.query.status === "warned"
            ? { warningCount: { $gt: 0 } }
            : req.query.status === "frozen"
              ? frozenFilter()
              : req.query.status === "restricted"
                ? {
                    $or: [
                      frozenFilter(),
                      { "restriction.status": "suspended" },
                    ],
                  }
                : { "restriction.status": "suspended" };
      filter.$and = [statusFilter];
    }
    res.json(await list(User, filter, req));
  })
);
router.get(
  "/users/:id",
  endpoint(async (req, res) => {
    const userId = id(req.params.id),
      user = await User.findById(userId).select(publicUserFields);
    if (!user) fail(404, "User not found");
    const [
      activeItems,
      soldItems,
      accommodations,
      received,
      submitted,
      warnings,
      restrictions,
      history,
    ] = await Promise.all([
      Item.countDocuments({ user: userId, status: { $ne: "sold" } }),
      Item.countDocuments({ user: userId, status: "sold" }),
      Accommodation.countDocuments({ user: userId }),
      Report.countDocuments({ reportedId: userId }),
      Report.countDocuments({ reporterId: userId }),
      Warning.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("adminId", "fullName"),
      Restriction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("adminId", "fullName"),
      ModerationAction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("adminId", "fullName"),
    ]);
    res.json({
      user: person(user),
      stats: { activeItems, soldItems, accommodations, received, submitted },
      warnings,
      restrictions,
      history,
    });
  })
);
router.get(
  "/listings",
  endpoint(async (req, res) => {
    const kind = choice(
      req.query.kind || "item",
      ["item", "accommodation"],
      "listing type"
    );
    const Model = kind === "item" ? Item : Accommodation,
      filter = {};
    if (req.query.q) filter.title = search(req.query.q);
    if (req.query.user)
      filter.user = new mongoose.Types.ObjectId(id(req.query.user));
    if (req.query.category)
      filter[kind === "item" ? "category" : "accommodationType"] = text(
        req.query.category,
        "category",
        true,
        100
      );
    if (req.query.status) {
      const status = choice(
        req.query.status,
        ["active", "sold", "hidden", "removed", "under_review"],
        "listing status"
      );
      if (status === "sold") filter.status = "sold";
      else
        filter.moderationStatus =
          status === "active"
            ? { $nin: ["hidden", "removed", "under_review"] }
            : status;
    }
    const { page, limit, skip } = paging(req.query);
    const sort = req.query.sort
      ? choice(req.query.sort, ["newest", "reports"], "sort order")
      : "newest";
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: Report.collection.name,
          let: { listingId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$reportedListingId", "$$listingId"] },
                    { $eq: ["$targetKind", kind] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                openCount: { $sum: { $cond: ["$open", 1, 0] } },
              },
            },
          ],
          as: "reportSummary",
        },
      },
      {
        $set: {
          reportCount: {
            $ifNull: [{ $arrayElemAt: ["$reportSummary.count", 0] }, 0],
          },
          openReportCount: {
            $ifNull: [{ $arrayElemAt: ["$reportSummary.openCount", 0] }, 0],
          },
        },
      },
      ...(req.query.reported === "true"
        ? [{ $match: { openReportCount: { $gt: 0 } } }]
        : []),
      {
        $facet: {
          rows: [
            {
              $sort:
                sort === "reports"
                  ? { reportCount: -1, createdAt: -1, _id: -1 }
                  : { createdAt: -1, _id: -1 },
            },
            { $skip: skip },
            { $limit: limit },
            { $project: { reportSummary: 0 } },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];
    const [result] = await Model.aggregate(pipeline);
    const rows = await Model.populate(result.rows, {
      path: "user",
      select: publicUserFields,
    });
    const total = result.total[0]?.count || 0;
    res.json({
      rows: rows.map((row) => ({ ...row, kind })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  })
);
for (const [path, Model] of [
  ["warnings", Warning],
  ["restrictions", Restriction],
  ["activity", ModerationAction],
])
  router.get(
    `/${path}`,
    endpoint(async (req, res) => {
      const filter = { ...dates(req.query) };
      if (req.query.user) filter.userId = id(req.query.user);
      res.json(
        await list(Model, filter, req, {
          path: "adminId userId",
          select: "fullName username profilePic",
        })
      );
    })
  );
router.get("/settings", (req, res) =>
  res.json({
    reportReasons,
    roles: ["user", "admin"],
    adminAssignment:
      "Admin access is assigned only through the server setup script.",
    privacy:
      "Chat review is limited to the reported conversation and up to 12 relevant messages.",
    reportLimit: "5 reports per account per hour",
  })
);

router.post("/actions", endpoint(recordModerationAction));
export default router;
