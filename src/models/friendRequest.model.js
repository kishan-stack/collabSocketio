import mongoose, { Schema } from "mongoose";

const requestSchema = new Schema(
    {
        sender: {
            type: String,
        },
        reciever: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export const friendReuest = new mongoose.model("friendRequest", requestSchema);