import { Server } from "socket.io";
import { Chat } from "./models/chat.models.js";
import { Message } from "./models/message.model.js";
import { User } from "./models/user.model.js";
import mongoose from "mongoose";
import { Team } from "./models/team.model.js";
import { TeamMesssage } from "./models/teamMessage.model.js";
const setUpSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:3000', // for local testing
                'https://collab-socketio-frontend.vercel.app' // live frontend
            ], // Allow requests from the frontend
            methods: ["GET", "POST"], // Allowed HTTP methods
            credentials: true,
            // Allow cookies if needed
        },
        transports: ["websocket", "polling"],
    });

    const userSocketMap = {};

    io.on("connection", async (socket) => {
        // Access the userId from the auth object
        const userId = socket.handshake.auth?.userId;
        const { id: socketId } = socket;

        console.log(`User ${userId} connected with socketId :: ${socketId}`);

        if (!userId) {
            socket.disconnect();
            return;
        }

        // Save the user's socketId in the userSocketMap
        userSocketMap[userId] = socketId;
        console.log("userSocketMap updated:", userSocketMap);
        // Event for sending a message
        socket.on("send_message", async ({ chatId, toUserId, message }) => {
            try {
                // Log received message
                console.log("Received chatId:", chatId);
                console.log("Received userId:", userId);
                console.log("Received toUserId:", toUserId);
                console.log("Received message:", message);

                const senderUser = await User.findOne({ kindeAuthId: userId });
                const recipientUser = await User.findOne({
                    kindeAuthId: toUserId,
                });
                // console.log("senderUser:", senderUser);
                // console.log("recipientuser:", recipientUser);
                // Ensure both sender and recipient exist
                if (!senderUser || !recipientUser) {
                    return socket.emit("error", "Invalid sender or recipient.");
                }

                const senderUserId = new mongoose.Types.ObjectId(
                    senderUser._id
                );
                const recipientUserId = new mongoose.Types.ObjectId(
                    recipientUser._id
                );

                // console.log("Sender User ID:", senderUserId);
                // console.log("Recipient User ID:", recipientUserId);

                // Check if chat exists between sender and recipient
                let chat = await Chat.findById(chatId);

                if (!chat) {
                    return socket.emit("error", "Chat not found.");
                }

                // Validate message structure
                if (!message || !message.text || !message.type) {
                    return socket.emit("error", "Invalid message structure.");
                }

                // Create new message
                const newMessage = await Message.create({
                    chatId: chat._id,
                    from: senderUserId,
                    to: recipientUserId,
                    type: message.type,
                    text: message.text,
                    mediaUrl: message.mediaUrl || null,
                });

                // Update chat with last message and message count
                chat.lastMessage = newMessage._id;
                await chat.save();

                // Emit the message to the recipient if they are online
                const recipientSocketId = userSocketMap[toUserId];
                console.log("Recipient Socket ID:", recipientSocketId);
                if (!recipientSocketId) {
                    console.log("Recipient not connected or userSocketMap is incorrect.");
                }
                console.log("Emitting message to recipient:", {
                    socketId: recipientSocketId,
                    sender: userId,
                    message,
                });
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit("new_message", {
                        sender: userId,
                        text: message.text,
                        type: message.type,
                        messageId: newMessage._id,
                        createdAt: newMessage.createdAt,
                    });
                } else {
                    console.log(
                        "Recipient not connected, not emitting message."
                    );
                }

                // Emit the message back to sender for confirmation
                socket.emit("send_message", {
                    sender: "me",
                    text: message.text,
                    type: message.type,
                    success: true,
                    chatId: chat._id,
                    messageId: newMessage._id,
                    timestamp: newMessage.createdAt,
                });
            } catch (error) {
                console.error("Error in send_message:", error);
                socket.emit("error", "Failed to send the message.");
            }
        });
        // Event to handle typing indicator


        socket.on("get_messages", async ({ chatId }) => {
            console.log("get messages called");
            try {
                // Log the chatId received
                console.log("Received chatId:", chatId);

                // Fetch messages for the given chatId and populate the 'from' and 'to' fields with User data
                const messages = await Message.find({ chatId })
                    .populate("from", "kindeAuthId name email") // Populate 'from' with 'name' and 'email'
                    .populate("to", "kindeAuthId name email")   // Populate 'to' with 'name' and 'email'
                    .sort({ createdAt: 1 })
                    .select("text type mediaUrl createdAt from to") // Sort by 'createdAt' to get messages in chronological order

                // Fetch the participants of the chat and populate with user details
                const chat = await Chat.findById(chatId)
                    .populate("participants", "kindeAuthId name email"); // Populate participants with user details

                // Extract the participants' details (excluding the logged-in user)
                const participants = chat.participants.find((participant) =>
                    participant.kindeAuthId !== userId // Exclude the logged-in user
                );

                // Emit the messages and participants back to the client
                socket.emit("get_messages", { chatId, messages, participants });
            } catch (error) {
                console.error("Error in get_messages:", error);
                socket.emit("error", "Failed to fetch messages.");
            }
        });


        // chat creation
        socket.on("create_chat", async ({ targetId }, callback) => {
            try {
                const sender = await User.findOne({ kindeAuthId: userId }).select("_id");
                const recipient = await User.findOne({ kindeAuthId: targetId }).select("_id");

                if (!sender || !recipient) {
                    callback({ error: "One or both users not found." });
                    return;
                }

                // Check if a chat already exists
                const existingChat = await Chat.findOne({
                    participants: { $all: [sender._id, recipient._id] },
                });

                if (existingChat) {
                    callback({ chat: existingChat, message: "Chat already exists!" });
                    return;
                }

                // Create a new chat
                const newChat = await Chat.create({
                    participants: [sender._id, recipient._id],
                });
                const chat = await Chat.findById(newChat._id).populate("participants", "kindeAuthId name email");


                // Notify the sender about the new chat
                callback({ chat, message: "Chat created successfully!" });

                // Emit an event to update the chat list for both participants
                const recipientSocketId = userSocketMap[targetId];
                const senderSocketId = userSocketMap[userId];

                if (senderSocketId) {
                    io.to(senderSocketId).emit("update_chat_list", { chat });
                }

                if (recipientSocketId) {
                    io.to(recipientSocketId).emit("update_chat_list", { chat });
                }

                console.log("Chat created and both users notified.");
            } catch (error) {
                console.error("Error in create_chat:", error);
                callback({ error: "Failed to create chat." });
            }
        });


        // test event
        socket.on("typing", ({ targetUserId, isTyping }) => {
            const recipientSocketId = userSocketMap[targetUserId];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("typing", {
                    userId,
                    isTyping,
                });
            }
        });


        socket.on("test_event", (data) => {
            console.log("Received test_event:", data);
        });


        // event to get direct conversations or chats
        socket.on("get_direct_conversations", async (callback) => {
            try {
                const mongodbUserId = await User.findOne({
                    kindeAuthId: userId,
                });
                const existingConversations = await Chat.find({
                    participants: { $all: [mongodbUserId] },
                })
                    .populate("participants", "kindeAuthId name email")
                    .select("_id participants chatId");
                // console.log("existingConversations:", existingConversations);
                callback(null, existingConversations);
            } catch (error) {
                callback(error, null);
            }
        });

        // team sockets
        socket.on("send_team_message", async ({ teamId, message }) => {
            try {
                console.log("Received teamId:", teamId);
                console.log("Received userId:", userId);
                console.log("Received message:", message);

                const senderUser = await User.findOne({ kindeAuthId: userId }).select("kindeAuthId name email");
                if (!senderUser) {
                    return socket.emit("error", "Invalid sender.");
                }

                const senderUserId = new mongoose.Types.ObjectId(senderUser._id);

                // Validate team existence
                const team = await Team.findById(teamId).populate("participants");
                if (!team) {
                    return socket.emit("error", "Team not found.");
                }

                // Validate message structure
                if (!message || !message.text || !message.type) {
                    return socket.emit("error", "Invalid message structure.");
                }

                // Create a new team message
                const newMessage = await TeamMesssage.create({
                    teamId: team._id,
                    from: senderUserId,
                    type: message.type,
                    text: message.text,
                    mediaUrl: message.mediaUrl || null,
                });

                // Update the team's last message
                team.lastMessage = newMessage._id;
                await team.save();

                // Construct the message payload
                const messagePayload = {
                    teamId: team._id,
                    from: {
                        kindeAuthId: senderUser.kindeAuthId,
                        name: senderUser.name,
                        email: senderUser.email,
                    },
                    text: message.text,
                    type: message.type,
                    messageId: newMessage._id,
                    createdAt: newMessage.createdAt,
                    clientGeneratedId: message.clientGeneratedId,
                };

                // Emit the message to all team participants
                team.participants.forEach((participant) => {
                    const recipientSocketId = userSocketMap[participant.kindeAuthId];
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit("new_team_message", {
                            ...messagePayload,
                            sender: participant.kindeAuthId === userId ? "me" : "other",
                        });
                    }
                });



                // Emit confirmation back to the sender
                socket.emit("send_team_message", {
                    sender: "me",
                    text: message.text,
                    type: message.type,
                    success: true,
                    teamId: team._id,
                    messageId: newMessage._id,
                    timestamp: newMessage.createdAt,
                });
            } catch (error) {
                console.error("Error in send_team_message:", error);
                socket.emit("error", "Failed to send the team message.");
            }
        });

        socket.on("get_team_messages", async ({ teamId }) => {
            console.log("get_team_messages called");
            try {
                console.log("Received teamId:", teamId);

                // Fetch messages for the given teamId and populate 'from' field with user details
                const messages = await TeamMesssage.find({ teamId })
                    .populate("from", "kindeAuthId name email") // Populate 'from' with user details
                    .sort({ createdAt: 1 }) // Sort messages in chronological order
                    .select("text type mediaUrl createdAt from"); // Select necessary fields

                // Fetch the team details
                const team = await Team.findById(teamId).populate(
                    "participants",
                    "kindeAuthId name email" // Populate participants with user details
                );

                if (!team) {
                    return socket.emit("error", "Team not found.");
                }

                // Structure team information
                const teamInfo = {
                    teamId: team._id,
                    teamName: team.teamName,
                    passphrase: team.passphrase,
                    participants: team.participants.map((participant) => ({
                        id: participant.kindeAuthId,
                        name: participant.name,
                        email: participant.email,
                    })),
                };

                // Emit the messages and team information back to the client
                socket.emit("get_team_messages", {
                    teamId,
                    messages,
                    teamInfo,
                });
            } catch (error) {
                console.error("Error in get_team_messages:", error);
                socket.emit("error", "Failed to fetch team messages.");
            }
        });


        // Handle disconnect
        socket.on("disconnect", () => {
            if (userId) {
                delete userSocketMap[userId];
                console.log(`User ${userId} disconnected`);
            }
        });
    });

    return io;
};

export { setUpSocket };
