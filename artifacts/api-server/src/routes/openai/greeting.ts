import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { LUCY_SYSTEM_PROMPT } from "../../data/mockData.js";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const { context } = req.body;

  if (!context) {
    res.status(400).json({ error: "context is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const greetingPrompt = `${LUCY_SYSTEM_PROMPT}

Alex's context for today: ${context}

Open with your first greeting. Be specific about the most time-sensitive thing — like the Sequoia call at 2:00 PM. Example energy: "Hey! I see that Sequoia call at 2:00. Want to bounce some ideas around before then?" One or two sentences max. Warm, casual, like you've been in the room.`;

    // Single gpt-audio call — text + audio in one stream (no two-step bottleneck)
    const stream = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "nova", format: "pcm16" },
      messages: [
        { role: "system", content: greetingPrompt },
        { role: "user", content: "Hey Lucy" },
      ],
      stream: true,
    });

    let transcriptBuffer = "";

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;

      if (delta?.audio?.transcript) {
        transcriptBuffer += delta.audio.transcript;
        res.write(`data: ${JSON.stringify({ type: "transcript", data: delta.audio.transcript })}\n\n`);
      }

      if (delta?.audio?.data) {
        res.write(`data: ${JSON.stringify({ type: "audio", data: delta.audio.data })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Lucy greeting failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Greeting failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Greeting failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
