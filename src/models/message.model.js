    import mongoose from "mongoose";

    const messageSchema = new mongoose.Schema(
        {
            chatId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Chat", // Reference to the Chat model
                required: true,
            },
            from: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User", // Reference to the User model (sender of the message)
                required: true,
            },
            to: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User", // Optional: Reference to the recipient (if it's a direct message)
            },
            type: {
                type: String,
                enum: ["Text", "Media", "Document", "Link"], // Different types of messages
                required: true,
            },
            text: {
                type: String,
                required: true, // Message content
            },
            mediaUrl: {
                type: String, // Optional: URL for media (e.g., image or video)
            },
        },
        {
            timestamps: true, // Automatically adds createdAt and updatedAt fields
        }
    );

    export const Message = mongoose.model("Message", messageSchema);
