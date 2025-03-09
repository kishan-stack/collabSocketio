import { Router } from "express";

const router = Router();
router.route("/:chatId/getMessages").get(getChatMessages);

export default router;