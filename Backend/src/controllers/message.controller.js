import cloudinary from "../lib/cloudinary.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";


export const getUsersForSidebar = async (req,res) => {
    try{
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
                    partnerId: {
                        $cond: [
                            { $eq: ["$senderId", loggedInUserId] },
                            "$receivedId",
                            "$senderId",
                        ],
                    },
                },
            },
            { $group: { _id: "$partnerId", latestMessageAt: { $first: "$createdAt" } } },
            { $sort: { latestMessageAt: -1 } },
        ]);

        const partnerIds = conversations.map((conversation) => conversation._id);
        const users = await User.find({ _id: { $in: partnerIds } }).select("-password");
        const userById = new Map(users.map((user) => [user._id.toString(), user]));

        // Keep the most recently active conversation at the top.
        const orderedUsers = partnerIds
            .map((id) => userById.get(id.toString()))
            .filter(Boolean);

        res.status(200).json(orderedUsers);
    }catch(error){
        console.log("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
}

export const getUserForChat = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserForChat: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getMessage = async (req, res) => {
    try{
        const { id: userToChatId} = req.params
        const myId = req.user._id;

        const messages = await Message.find({
            $or:[
                {senderId:myId, receivedId: userToChatId},
                {senderId:userToChatId, receivedId:myId}
            ]
        })

        res.status(200).json(messages)
    }catch(error){
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
}

export const sendMessage = async (req, res) =>{
    try{
        const {text, image} = req.body;
        const {id: receivedId} = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if(image){
            //Upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message ({
            senderId,
            receivedId,
            text,
            image: imageUrl
        });

        await newMessage.save();

        // realtime functionality goes here => socket.io
        const receiverSocketId = getReceiverSocketId(receivedId);
        if(receiverSocketId){
            const payload = {
                ...newMessage.toObject(),
                senderId,
                senderName: req.user.fullName,
                senderProfilePic: req.user.profilePic,
            };
            io.to(receiverSocketId).emit("newMessage", payload);
            io.to(receiverSocketId).emit("unreadCountUpdate", {
                senderId,
                unreadCount: 1,
            });
        }

        res.status(201).json(newMessage);
    }catch(error){
        console.log("Error in sendMessage controller:", error.message);
        res.status(500).json({error: "Internal server error"});
    }
}

export const markMessagesAsSeen = async (req, res) => {
    try{
        const { id: userId } = req.params;
        const myId = req.user._id;

        await Message.updateMany(
            { senderId: userId, receivedId: myId, seen: false },
            { seen: true }
        );

        // Emit socket event to notify sender that messages are seen
        const senderSocketId = getReceiverSocketId(userId);
        if(senderSocketId){
            io.to(senderSocketId).emit("messagesSeen", { userId: myId });
        }

        res.status(200).json({ message: "Messages marked as seen" });
    }catch(error){
        console.log("Error in markMessagesAsSeen controller:", error.message);
        res.status(500).json({error: "Internal server error"});
    }
}

export const getUnreadCount = async (req, res) => {
    try{
        const myId = req.user._id;

        // Get total unread count from all users
        const unreadMessages = await Message.aggregate([
            { $match: { receivedId: myId, seen: false } },
            {
                $group: {
                    _id: "$senderId",
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalUnread = unreadMessages.reduce((sum, item) => sum + item.count, 0);
        
        // Map with sender details
        const result = await Promise.all(
            unreadMessages.map(async (item) => {
                const sender = await User.findById(item._id).select("_id fullName profilePic");
                return {
                    userId: item._id,
                    count: item.count,
                    user: sender
                };
            })
        );

        res.status(200).json({ 
            total: totalUnread,
            byUser: result
        });
    }catch(error){
        console.log("Error in getUnreadCount controller:", error.message);
        res.status(500).json({error: "Internal server error"});
    }
}
