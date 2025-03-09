import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
    {

        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User", // Reference to User model
                required: true,
            },
        ],
        teamName: {
            type: String, // Optional: Chat name (for group chats)
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message", // Reference to the latest message in the chat
        },
        teamLeader: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        passphrase: {
            type: String,
            required: true, // Ensure it's provided
            unique: true, // Optional: Enforce unique passphrases
            trim: true,
        },
    },
    {
        timestamps: true, // Automatically includes createdAt and updatedAt fields
    }
);

export const Team = mongoose.model("Team", teamSchema);
