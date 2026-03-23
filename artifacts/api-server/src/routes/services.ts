import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { connectedServices } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// GET /api/services — list names of services connected for this user
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const rows = await db
      .select()
      .from(connectedServices)
      .where(eq(connectedServices.userId, req.session.userId));
    res.json(rows.map(r => r.serviceName));
  } catch {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// POST /api/services/:name/connect — mark service as connected
router.post("/:name/connect", requireAuth, async (req: any, res) => {
  const { name } = req.params;
  const ALLOWED = ["google", "outlook", "gmail"];
  if (!ALLOWED.includes(name)) {
    res.status(400).json({ error: "Unknown service" });
    return;
  }
  try {
    // Remove existing entry (idempotent reconnect)
    await db
      .delete(connectedServices)
      .where(and(
        eq(connectedServices.userId, req.session.userId),
        eq(connectedServices.serviceName, name),
      ));
    const [row] = await db
      .insert(connectedServices)
      .values({ userId: req.session.userId, serviceName: name })
      .returning();
    res.status(201).json({ serviceName: row.serviceName, connectedAt: row.connectedAt });
  } catch {
    res.status(500).json({ error: "Failed to connect service" });
  }
});

// DELETE /api/services/:name/disconnect — remove connection
router.delete("/:name/disconnect", requireAuth, async (req: any, res) => {
  const { name } = req.params;
  try {
    await db
      .delete(connectedServices)
      .where(and(
        eq(connectedServices.userId, req.session.userId),
        eq(connectedServices.serviceName, name),
      ));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to disconnect service" });
  }
});

export default router;
