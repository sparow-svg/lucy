import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/context", (_req, res) => {
  res.json({ currentTime: new Date().toISOString() });
});

export default router;
