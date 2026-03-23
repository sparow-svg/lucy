import { Router, type IRouter } from "express";
import { mockUserContext } from "../data/mockData.js";

const router: IRouter = Router();

router.get("/context", (_req, res) => {
  const context = {
    ...mockUserContext,
    currentTime: new Date().toISOString(),
  };
  res.json(context);
});

export default router;
