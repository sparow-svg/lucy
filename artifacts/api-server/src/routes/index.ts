import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import assistantRouter from "./assistant.js";
import openaiRouter from "./openai/index.js";
import authRouter from "./auth.js";
import tasksRouter from "./tasks.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/tasks", tasksRouter);
router.use("/assistant", assistantRouter);
router.use("/openai", openaiRouter);

export default router;
