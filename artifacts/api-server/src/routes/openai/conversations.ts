import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, asc, desc, count } from "drizzle-orm";

const router: IRouter = Router();

function getUserId(req: any): number | null {
  return req.session?.userId ?? null;
}

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    let query = db.select().from(conversations).$dynamic();
    if (userId) {
      query = query.where(eq(conversations.userId, userId));
    }
    const allConversations = await query.orderBy(desc(conversations.createdAt));
    res.json(allConversations);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    let { title } = req.body;

    if (!title?.trim()) {
      if (userId) {
        const [{ value: convCount }] = await db
          .select({ value: count() })
          .from(conversations)
          .where(eq(conversations.userId, userId));
        title = `Lucy Conversation ${Number(convCount) + 1}`;
      } else {
        const [{ value: convCount }] = await db
          .select({ value: count() })
          .from(conversations);
        title = `Lucy Conversation ${Number(convCount) + 1}`;
      }
    }

    const [conversation] = await db
      .insert(conversations)
      .values({ title, userId: userId ?? undefined })
      .returning();
    res.status(201).json(conversation);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = getUserId(req);
    const { title } = req.body;
    if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    if (userId && conv.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const [updated] = await db
      .update(conversations)
      .set({ title: title.trim() })
      .where(eq(conversations.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    res.json({ ...conversation, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [deleted] = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
