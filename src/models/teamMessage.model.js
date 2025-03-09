    import mongoose from "mongoose";

    const teamMessageSchema = new mongoose.Schema(
        {
            teamId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Team", // Reference to the Chat model
                required: true,
            },
            from: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User", // Reference to the User model (sender of the message)
                required: true,
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

    export const TeamMesssage = mongoose.model("TeamMessage",teamMessageSchema);
