import { Router, type IRouter } from "express";
import conversationsRouter from "./conversations.js";
import voiceRouter from "./voice.js";
import greetingRouter from "./greeting.js";

const router: IRouter = Router();

router.use("/conversations", conversationsRouter);
router.use("/conversations", voiceRouter);
router.use("/proactive-greeting", greetingRouter);

export default router;
