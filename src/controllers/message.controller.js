import { ApiError } from "@kinde/management-api-js";
import { Message } from "../models/message.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
export const getChatMessages = asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    try {
        const messages = await Message.find({ chat: chatId }).sort({
            createdAt: 1,
        });
        if (!messages) {
            throw new ApiError(400,"No messages found with the user");
        }
        return res.status(200).json(
            new ApiResponse(200,messages,"Messages retrieved successfully!")
        )
    } catch (error) {
        console.log("Error fetching messages of chat",error);
        throw new ApiError(500,"Something went wrong while fetching messages of the chat");
    }
});
