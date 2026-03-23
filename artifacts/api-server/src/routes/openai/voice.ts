import { Router, type IRouter } from "express";
import { db, messages, conversations } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import { openai } from "@workspace/integrations-openai-ai-server";
import { LUCY_SYSTEM_PROMPT } from "../../data/mockData.js";

const router: IRouter = Router({ mergeParams: true });

// How many recent turns of history to include
const MAX_HISTORY_TURNS = 8;

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

    const { audio } = req.body;
    if (!audio) {
      res.status(400).json({ error: "audio is required" });
      return;
    }

    const audioBuffer = Buffer.from(audio, "base64");
    const { buffer, format } = await ensureCompatibleFormat(audioBuffer);
    const audioBase64 = buffer.toString("base64");

    // Fetch recent conversation history for context
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.id));

    // Build history messages — text-only turns from DB
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

    // Single gpt-audio call: system + history + current audio input → streaming text + audio
    const stream = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "nova", format: "pcm16" },
      messages: [
        { role: "system", content: LUCY_SYSTEM_PROMPT },
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
      // Capture user transcript if returned
      if (delta?.content) {
        userTranscript += delta.content;
      }
    }

    // Save both turns to DB (with real transcript for future context)
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

    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    // Fetch recent history
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

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: LUCY_SYSTEM_PROMPT },
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
