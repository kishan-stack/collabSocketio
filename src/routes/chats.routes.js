import { Router } from "express";
// import { createChat } from "../controllers/chat.controller.js";
import { getUser, protectRoute } from "@kinde-oss/kinde-node-express";

const router = Router();
// router.route("/createChat").post(protectRoute,getUser,createChat);

export default router;