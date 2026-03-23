import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { CHIEF_OF_STAFF_SYSTEM_PROMPT } from "../../data/mockData.js";

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
    const greetingPrompt = `${CHIEF_OF_STAFF_SYSTEM_PROMPT}

User context for today: ${context}

Greet the user with ONE brief, specific, helpful sentence. Reference something concrete from their day. No pleasantries.`;

    const textRes = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "user", content: greetingPrompt },
      ],
    });

    const greetingText = textRes.choices[0]?.message?.content ?? "Ready when you are.";

    res.write(`data: ${JSON.stringify({ type: "transcript", data: greetingText })}\n\n`);

    const ttsStream = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: "pcm16" },
      messages: [
        {
          role: "user",
          content: `Say exactly this, naturally: "${greetingText}"`,
        },
      ],
      stream: true,
    });

    for await (const chunk of ttsStream) {
      const delta = chunk.choices?.[0]?.delta as any;
      if (delta?.audio?.data) {
        res.write(`data: ${JSON.stringify({ type: "audio", data: delta.audio.data })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Greeting failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Greeting failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Greeting failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
