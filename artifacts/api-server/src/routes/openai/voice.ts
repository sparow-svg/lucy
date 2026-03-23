import { Router, type IRouter } from "express";
import { db, messages, conversations } from "@workspace/db";
import { eq } from "drizzle-orm";
import { voiceChatStream, ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import { openai } from "@workspace/integrations-openai-ai-server";
import { CHIEF_OF_STAFF_SYSTEM_PROMPT } from "../../data/mockData.js";

const router: IRouter = Router({ mergeParams: true });

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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let assistantTranscript = "";

    const stream = await voiceChatStream(buffer, "alloy", format);

    for await (const event of stream) {
      if (event.type === "transcript") {
        assistantTranscript += event.data;
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    await db.insert(messages).values([
      { conversationId: id, role: "user", content: "[voice message]" },
      { conversationId: id, role: "assistant", content: assistantTranscript },
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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: CHIEF_OF_STAFF_SYSTEM_PROMPT },
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
