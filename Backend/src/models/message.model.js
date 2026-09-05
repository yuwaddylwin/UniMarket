import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        senderId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receivedId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        seenAt: { type: Date, default: null },
        seen: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true} // createdAt , updatedAt 
);

messageSchema.index({ senderId: 1, receivedId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;