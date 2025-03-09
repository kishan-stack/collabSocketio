import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
    {
        
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User", // Reference to User model
                required: true,
            },
        ],
        chatName: {
            type: String, // Optional: Chat name (for group chats)
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message", // Reference to the latest message in the chat
        },
    },
    {
        timestamps: true, // Automatically includes createdAt and updatedAt fields
    }
);

export const Chat = mongoose.model("Chat", chatSchema);
