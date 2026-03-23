import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import assistantRouter from "./assistant.js";
import openaiRouter from "./openai/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/assistant", assistantRouter);
router.use("/openai", openaiRouter);

export default router;
