import { Router, type IRouter } from "express";
import { db, messages, conversations, tasks, memories, nudges } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildSystemMessage } from "../../data/mockData.js";

const router: IRouter = Router({ mergeParams: true });

const MAX_HISTORY_TURNS = 10;

async function getUserContext(userId: number | null): Promise<string> {
  if (!userId) return "";
  let extra = "";
  try {
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(asc(tasks.createdAt));
    const pending = userTasks.filter(t => !t.completed);
    if (pending.length) {
      const list = pending.map(t => `- ${t.text}`).join("\n");
      extra += `\n\n--- USER'S CURRENT TASKS ---\n${list}\n(Reference tasks when contextually relevant. Do not list them unprompted.)`;
    }
  } catch { /* ignore */ }
  try {
    const userMemories = await db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(asc(memories.createdAt));
    if (userMemories.length) {
      const list = userMemories.map(m => `- ${m.text}`).join("\n");
      extra += `\n\n--- LUCY REMEMBERS ---\n${list}\n(Use this context naturally when relevant. Reference these only when contextually appropriate — do not list or recite them unprompted.)`;
    }
  } catch { /* ignore */ }
  try {
    const now = new Date();
    const userNudges = await db
      .select()
      .from(nudges)
      .where(
        and(
          eq(nudges.userId, userId),
          eq(nudges.dismissed, false)
        )
      )
      .orderBy(asc(nudges.createdAt));
    const activeNudges = userNudges.filter(n => !n.dueAt || n.dueAt <= now);
    if (activeNudges.length) {
      const list = activeNudges.map(n => {
        const dueStr = n.dueAt ? ` (due ${n.dueAt.toLocaleString("en-US", { timeZone: "UTC" })})` : "";
        return `- ${n.text}${dueStr}`;
      }).join("\n");
      extra += `\n\n--- ACTIVE NUDGES ---\n${list}\n(Mention these nudges naturally when the moment is right — only once each, never repeat.)`;
    }
  } catch { /* ignore */ }
  return extra;
}

router.post("/:id/voice-messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const { audio, firstName } = req.body;
    if (!audio) {
      res.status(400).json({ error: "audio is required" });
      return;
    }

    const userId = (req as any).session?.userId ?? null;
    const audioBuffer = Buffer.from(audio, "base64");
    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);
    const audioBase64 = buffer.toString("base64");

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.id));

    const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
    const historyMessages = recentHistory
      .filter((m) => m.content && m.content !== "[voice message]")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content as string,
      }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let userTranscript = "";
    let assistantTranscript = "";

    const extraContext = await getUserContext(userId);
    const resolvedName = firstName as string | undefined;
    const systemMsg = buildSystemMessage(resolvedName) + extraContext;

    const stream = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "nova", format: "pcm16" },
      messages: [
        { role: "system", content: systemMsg },
        ...historyMessages,
        {
          role: "user",
          content: [
            { type: "input_audio", input_audio: { data: audioBase64, format } },
          ] as any,
        },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;
      if (!delta) continue;

      if (delta?.audio?.transcript) {
        assistantTranscript += delta.audio.transcript;
        res.write(`data: ${JSON.stringify({ type: "transcript", data: delta.audio.transcript })}\n\n`);
      }
      if (delta?.audio?.data) {
        res.write(`data: ${JSON.stringify({ type: "audio", data: delta.audio.data })}\n\n`);
      }
      if (delta?.content) {
        userTranscript += delta.content;
      }
    }

    await db.insert(messages).values([
      {
        conversationId: id,
        role: "user",
        content: userTranscript || "[voice input]",
      },
      {
        conversationId: id,
        role: "assistant",
        content: assistantTranscript,
      },
    ]);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Voice message failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Voice processing failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Voice processing failed" })}\n\n`);
      res.end();
    }
  }
});

router.post("/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const { content, firstName } = req.body;
    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const userId = (req as any).session?.userId ?? null;
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.id));

    const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
    const historyMessages = recentHistory
      .filter((m) => m.content && m.content !== "[voice message]")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content as string,
      }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";
    const extraContext = await getUserContext(userId);
    const systemMsg = buildSystemMessage(firstName as string | undefined) + extraContext;

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemMsg },
        ...historyMessages,
        { role: "user", content },
      ],
      max_completion_tokens: 8192,
      stream: true,
    });

    for await (const chunk of stream) {
      const c = chunk.choices[0]?.delta?.content;
      if (c) {
        fullResponse += c;
        res.write(`data: ${JSON.stringify({ content: c })}\n\n`);
      }
    }

    await db.insert(messages).values([
      { conversationId: id, role: "user", content },
      { conversationId: id, role: "assistant", content: fullResponse },
    ]);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Text message failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Text processing failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Text processing failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
