import { User } from "../models/user.model.js";
import { Team } from "../models/team.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createTeam = asyncHandler(async (req, res) => {
    const { teamName, passphrase } = req.body;
    const { id: kindeAuthId } = req.user;

    console.log("Creating team:", teamName, passphrase, kindeAuthId);

    try {
        // Validate inputs early to avoid unnecessary DB queries
        if (!teamName || teamName.length < 3 || teamName.length > 50) {
            throw new ApiError(400, "Team name must be between 3 and 50 characters long.");
        }

        const validTeamName = /^[a-zA-Z0-9\s]+$/;
        if (!validTeamName.test(teamName)) {
            throw new ApiError(400, "Team name can only contain letters, numbers, and spaces.");
        }

        if (!passphrase || passphrase.length < 6 || passphrase.length > 20) {
            throw new ApiError(400, "Passphrase must be between 6 and 20 characters long.");
        }

        // Combine user lookup and validations in one call
        const userCreatingTeam = await User.findOne({ kindeAuthId }).select("_id name email");

        if (!userCreatingTeam) {
            throw new ApiError(404, "User not found.");
        }

        // Check for passphrase uniqueness
        const existingTeam = await Team.findOne({ passphrase }).select("_id");
        if (existingTeam) {
            throw new ApiError(400, "Passphrase already in use. Try another one.");
        }

        // Create and return the new team in a single step
        const newTeam = await Team.create({
            teamName,
            passphrase,
            lastMessage: null,
            teamLeader: userCreatingTeam._id,
            participants: [userCreatingTeam._id],
        });

        // Use aggregation to populate `teamLeader` and `participants` in one query
        const populatedTeam = await Team.aggregate([
            { $match: { _id: newTeam._id } },
            {
                $lookup: {
                    from: "users",
                    localField: "teamLeader",
                    foreignField: "_id",
                    as: "teamLeader",
                },
            },
            { $unwind: "$teamLeader" },
            {
                $lookup: {
                    from: "users",
                    localField: "participants",
                    foreignField: "_id",
                    as: "participants",
                },
            },
            {
                $project: {
                    _id: 1,
                    teamName: 1,
                    passphrase: 1,
                    lastMessage: 1,
                    "teamLeader._id": 1,
                    "teamLeader.name": 1,
                    "teamLeader.email": 1,
                    "teamLeader.kindeAuthId": 1,
                    "participants._id": 1,
                    "participants.name": 1,
                    "participants.email": 1,
                    "participants.kindeAuthId": 1,
                },
            },
        ]);

        return res.status(201).json(
            new ApiResponse(201, populatedTeam[0], "Team created successfully.")
        );
    } catch (error) {
        console.error("Error creating team:", error);
        throw new ApiError(500, "Error creating team.");
    }
});


export const getTeams = asyncHandler(async (req, res) => {
    const { id: kindeAuthId } = req.user;
    try {
        const user = await User.findOne({ kindeAuthId });
        const teams = await Team.find({ participants: user._id }).populate("participants", "name email kindeAuthId").populate("teamLeader", "name email kindeAuthId");
        if (!teams) {
            throw new ApiError(404, "No teams found");
        }
        return res.status(200).json(
            new ApiResponse(200, teams, "Teams fetched successfully")
        );
    } catch (error) {
        console.log("Error fetching teams:", error);
        throw new ApiError(500, "Error fetching teams");
    }
});

export const joinTeam = asyncHandler(async (req, res) => {
    const { passphrase } = req.body;
    const { id: kindeAuthId } = req.user;

    if (!passphrase) {
        throw new ApiError(400, "Passphrase is required");
    }

    try {
        // Find the team by passphrase and populate teamLeader and participants
        const team = await Team.findOne({ passphrase })
            .populate("teamLeader", "name kindeAuthId email")
            .populate("participants", "name kindeAuthId email");

        if (!team) {
            throw new ApiError(404, "Team not found");
        }

        // Find the user by KindeAuth ID
        const user = await User.findOne({ kindeAuthId }).select("_id").lean();

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Check if the user is already in the team
        const isAlreadyParticipant = team.participants.some(
            (participant) => participant._id.toString() === user._id.toString()
        );
        if (isAlreadyParticipant) {
            throw new ApiError(400, "User already in the team");
        }

        // Add the user to the team's participants array
        team.participants.push(user._id);
        await team.save();

        // Fetch the updated team and format the response
        const updatedTeam = await Team.findById(team._id)
            .populate("teamLeader", "name kindeAuthId email")
            .populate("participants", "name kindeAuthId email")
            .lean();

        // Prepare the response
        const teamDetails = {
            teamName: updatedTeam.teamName,
            passphrase: updatedTeam.passphrase,
            teamLeader: {
                id: updatedTeam.teamLeader._id,
                name: updatedTeam.teamLeader.name,
                email: updatedTeam.teamLeader.email,
                kindeAuthId: updatedTeam.teamLeader.kindeAuthId,
            },
            participants: updatedTeam.participants.map((participant) => ({
                id: participant._id,
                name: participant.name,
                email: participant.email,
                kindeAuthId: participant.kindeAuthId,
            })),
        };

        return res.status(200).json(
            new ApiResponse(200, teamDetails, "User joined the team successfully.")
        );
    } catch (error) {
        console.error("Error joining team:", error);
        throw new ApiError(500, "Error joining team");
    }
});


