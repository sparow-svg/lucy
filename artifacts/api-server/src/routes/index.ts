import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import assistantRouter from "./assistant.js";
import openaiRouter from "./openai/index.js";
import authRouter from "./auth.js";
import tasksRouter from "./tasks.js";
import memoriesRouter from "./memories.js";
import nudgesRouter from "./nudges.js";
import servicesRouter from "./services.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/tasks", tasksRouter);
router.use("/memories", memoriesRouter);
router.use("/nudges", nudgesRouter);
router.use("/services", servicesRouter);
router.use("/assistant", assistantRouter);
router.use("/openai", openaiRouter);

export default router;
