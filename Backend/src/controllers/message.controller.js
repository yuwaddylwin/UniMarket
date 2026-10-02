import { assertActive } from "../services/moderationPolicy.js";
import { addChatAlert, isChatPageActive } from "../services/chatAlerts.js";
import { ChatAlert } from "../models/chatAlert.model.js";
import { createReport } from "../routes/reports.route.js";
import {
  pairFilter,
  validatePartner,
  withChatTransaction,
  isBlocked,
  blockState,
  fail,
  chatError,
} from "../services/chatSafety.js";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receivedId: loggedInUserId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          createdAt: 1,
          partnerId: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receivedId",
              "$senderId",
            ],
          },
        },
      },
      { $match: { partnerId: { $ne: loggedInUserId } } },
      {
        $group: {
          _id: "$partnerId",
          latestMessageAt: { $first: "$createdAt" },
        },
      },
      { $sort: { latestMessageAt: -1 } },
    ]);

    const partnerIds = conversations.map((conversation) => conversation._id);
    const users = await User.find({ _id: { $in: partnerIds } }).select(
      "fullName username profilePic"
    );
    const userById = new Map(users.map((user) => [user._id.toString(), user]));

    // Keep the most recently active conversation at the top.
    const orderedUsers = partnerIds
      .map((id) => userById.get(id.toString()))
      .filter(Boolean);

    res.status(200).json(orderedUsers);
  } catch (error) {
    console.log("Error in getUsersForSidebar: ", error.message);
    chatError(res, error);
  }
};

export const getUserForChat = async (req, res) => {
  try {
    await validatePartner(req.user._id, req.params.id);
    const user = await User.findById(req.params.id).select(
      "fullName username profilePic"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getUserForChat: ", error.message);
    chatError(res, error);
  }
};

export const getMessage = async (req, res) => {
  try {
    await validatePartner(req.user._id, req.params.id);
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receivedId: userToChatId },
        { senderId: userToChatId, receivedId: myId },
      ],
    }).sort({ createdAt: 1, _id: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    chatError(res, error);
  }
};

export const sendMessage = async (req, res) => {
  try {
    const other = req.params.id;
    await validatePartner(req.user._id, other);
    const { text, image } = req.body;
    if (
      (text != null && typeof text !== "string") ||
      (image != null && typeof image !== "string") ||
      (!text?.trim() && !image) ||
      text?.length > 10000
    )
      fail(
        400,
        "Enter a message of up to 10,000 characters or attach an image"
      );
    let imageUrl;
    if (image) {
      if (
        !/^data:image\/(png|jpeg|webp|gif);base64,/.test(image) ||
        image.length > 14000000
      )
        fail(400, "Choose a PNG, JPEG, WebP or GIF image under 10 MB");
      imageUrl = (await cloudinary.uploader.upload(image)).secure_url;
    }
    const message = await withChatTransaction(
      req.user._id,
      other,
      async (session, me, partner) => {
        assertActive(me);
        if (isBlocked(me, partner))
          fail(
            403,
            "Messaging is unavailable because one of you has blocked the other"
          );
        const seen = await isChatPageActive(partner._id);
        const [created] = await Message.create(
          [
            {
              senderId: me._id,
              receivedId: partner._id,
              text: text?.trim(),
              image: imageUrl,
              seen,
              seenAt: seen ? new Date() : null,
            },
          ],
          { session }
        );
        if (!seen)
          await addChatAlert(
            {
              userId: partner._id,
              eventKey: `message:${created._id}`,
              kind: "message",
              senderId: me._id,
              messageId: created._id,
              title: `${me.fullName} sent you a message`,
              body: "Open the conversation to read your message.",
              url: `/chat/${me._id}`,
            },
            session
          );
        return created;
      }
    );
    io.to(getReceiverSocketId(other)).emit("newMessage", {
      ...message.toObject(),
      senderName: req.user.fullName,
      senderProfilePic: req.user.profilePic,
    });
    io.to(getReceiverSocketId(other)).emit("unreadCountUpdate", {
      senderId: String(req.user._id),
      unreadCount: 1,
    });
    io.to(getReceiverSocketId(req.user._id)).emit(
      "messageSent",
      message.toObject()
    );
    res.status(201).json(message);
  } catch (error) {
    chatError(res, error);
  }
};

export const markMessagesAsSeen = async (req, res) => {
  try {
    const ids = req.body.messageIds;
    if (
      !Array.isArray(ids) ||
      ids.length > 500 ||
      ids.some((id) => typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id))
    )
      fail(400, "Invalid message IDs");
    const seenAt = new Date();
    const messageIds = await withChatTransaction(
      req.user._id,
      req.params.id,
      async (session) => {
        const filter = {
          _id: { $in: ids },
          senderId: req.params.id,
          receivedId: req.user._id,
          seen: { $ne: true },
        };
        const messages = await Message.find(filter)
          .select("_id")
          .session(session);
        await Message.updateMany(
          filter,
          { $set: { seen: true, seenAt } },
          { session }
        );
        await ChatAlert.updateMany(
          {
            userId: req.user._id,
            messageId: { $in: messages.map((m) => m._id) },
            readAt: null,
          },
          { $set: { readAt: seenAt } },
          { session }
        );
        return messages.map((m) => String(m._id));
      }
    );
    io.to(getReceiverSocketId(req.params.id)).emit("messagesSeen", {
      userId: String(req.user._id),
      messageIds,
      seenAt,
    });
    io.to(getReceiverSocketId(req.user._id)).emit("unreadChanged");
    res.json({ messageIds, seenAt });
  } catch (error) {
    chatError(res, error);
  }
};

export const getBlockStatus = async (req, res) => {
  try {
    const other = await validatePartner(req.user._id, req.params.id);
    res.set("Cache-Control", "no-store");
    res.json(blockState(req.user, other));
  } catch (error) {
    chatError(res, error);
  }
};
export const deleteChat = async (req, res) => {
  try {
    await withChatTransaction(req.user._id, req.params.id, async (session) => {
      const filter = pairFilter(req.user._id, req.params.id);
      if (!(await Message.exists(filter).session(session)))
        fail(404, "Conversation not found");
      await Message.deleteMany(filter, { session });
    });
    for (const id of [String(req.user._id), req.params.id])
      io.to(getReceiverSocketId(id)).emit("chatDeleted", {
        userId: id === req.params.id ? String(req.user._id) : req.params.id,
      });
    res.json({ message: "Messages deleted" });
  } catch (error) {
    chatError(res, error);
  }
};
export const reportUser = (req, res) => {
  // Preserve the existing chat-report URL and free-text payload.
  const legacy = req.body.reason;
  if (typeof legacy !== "string" || !legacy.trim() || legacy.length > 2000)
    return res
      .status(400)
      .json({ message: "Enter a report reason of up to 2,000 characters" });
  req.body = {
    targetKind: "user",
    targetId: req.params.id,
    reason: "Other",
    description: legacy,
  };
  return createReport(req, res);
};

export const getUnreadCount = async (req, res) => {
  try {
    const myId = req.user._id;

    // Get total unread count from all users
    const unreadMessages = await Message.aggregate([
      { $match: { receivedId: myId, senderId: { $ne: myId }, seen: false } },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalUnread = unreadMessages.reduce(
      (sum, item) => sum + item.count,
      0
    );

    // Map with sender details
    const result = await Promise.all(
      unreadMessages.map(async (item) => {
        const sender = await User.findById(item._id).select(
          "_id fullName profilePic"
        );
        return {
          userId: item._id,
          count: item.count,
          user: sender,
        };
      })
    );

    res.status(200).json({
      total: totalUnread,
      byUser: result,
    });
  } catch (error) {
    console.log("Error in getUnreadCount controller:", error.message);
    chatError(res, error);
  }
};

// Visiting the active Chat page acknowledges incoming messages across its inbox.
export const markAllMessagesAsSeen = async (req, res) => {
  try {
    const seenAt = new Date();
    const messages = await Message.find({
      receivedId: req.user._id,
      seen: { $ne: true },
    })
      .select("_id senderId")
      .limit(500);
    const ids = messages.map((message) => message._id);
    await Message.updateMany(
      { _id: { $in: ids }, receivedId: req.user._id },
      { $set: { seen: true, seenAt } }
    );
    await ChatAlert.updateMany(
      { userId: req.user._id, messageId: { $in: ids }, readAt: null },
      { $set: { readAt: seenAt } }
    );
    const senders = [
      ...new Set(messages.map((message) => String(message.senderId))),
    ];
    for (const senderId of senders)
      io.to(getReceiverSocketId(senderId)).emit("messagesSeen", {
        userId: String(req.user._id),
        messageIds: messages
          .filter((message) => String(message.senderId) === senderId)
          .map((message) => String(message._id)),
        seenAt,
      });
    io.to(getReceiverSocketId(req.user._id)).emit("unreadChanged");
    res.json({ count: messages.length, hasMore: messages.length === 500 });
  } catch (error) {
    chatError(res, error);
  }
};
