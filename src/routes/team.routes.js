import { Router } from "express";
import { getUser, protectRoute } from "@kinde-oss/kinde-node-express";
import { createTeam, getTeams, joinTeam } from "../controllers/team.controller.js";
const router = Router();

router.route("/createTeam").post(protectRoute, getUser, createTeam);
router.route("/getTeams").get(protectRoute, getUser, getTeams);
router.route("/joinTeam").post(protectRoute, getUser, joinTeam);

export default router;