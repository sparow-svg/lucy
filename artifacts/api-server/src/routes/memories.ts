import { Router, type IRouter } from "express";
import { db, memories } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.get("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const items = await db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(asc(memories.createdAt));
    res.json(items);
  } catch (err) {
    req.log.error({ err }, "Failed to list memories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { text } = req.body;
  if (!text?.trim()) { res.status(400).json({ error: "text is required" }); return; }
  try {
    const [mem] = await db
      .insert(memories)
      .values({ userId, text: text.trim() })
      .returning();
    res.status(201).json(mem);
  } catch (err) {
    req.log.error({ err }, "Failed to create memory");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id, 10);
  try {
    const [deleted] = await db
      .delete(memories)
      .where(eq(memories.id, id))
      .returning();
    if (!deleted || deleted.userId !== userId) {
      res.status(404).json({ error: "Memory not found" }); return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete memory");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
