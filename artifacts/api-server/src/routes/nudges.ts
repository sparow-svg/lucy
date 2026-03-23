import { Router, type IRouter } from "express";
import { db, nudges } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const rows = await db
      .select()
      .from(nudges)
      .where(
        and(
          eq(nudges.userId, req.session.userId),
          eq(nudges.dismissed, false)
        )
      )
      .orderBy(asc(nudges.createdAt));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch nudges" });
  }
});

router.post("/", requireAuth, async (req: any, res) => {
  try {
    const { text, dueAt } = req.body as { text?: string; dueAt?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }
    const [row] = await db
      .insert(nudges)
      .values({
        userId: req.session.userId,
        text: text.trim(),
        dueAt: dueAt ? new Date(dueAt) : null,
        dismissed: false,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: "Failed to create nudge" });
  }
});

router.patch("/:id/dismiss", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [row] = await db
      .update(nudges)
      .set({ dismissed: true })
      .where(and(eq(nudges.id, id), eq(nudges.userId, req.session.userId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to dismiss nudge" });
  }
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db
      .delete(nudges)
      .where(and(eq(nudges.id, id), eq(nudges.userId, req.session.userId)));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete nudge" });
  }
});

export default router;
