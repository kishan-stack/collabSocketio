import { Router } from "express";
import { protectRoute, getUser } from "@kinde-oss/kinde-node-express";
import {
    getAllUser,
    getPotentialUsers,
    getTags,
    getUserProfile,
    updateUserProfile,
} from "../controllers/recommendation.controller.js";
const router = Router();
router.route("/getAllUsers/:userid").get(protectRoute, getUser, getUserProfile);
router.route("/getAllUsers/").get(protectRoute, getUser, getAllUser);
router.route("/getTags").get(protectRoute, getUser, getTags);
router.route("/saveUserProfile").post(protectRoute, getUser, updateUserProfile);
router
    .route("/getPotentialUsers")
    .post(protectRoute, getUser, getPotentialUsers);
export default router;
