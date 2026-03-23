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

Give your opening greeting. Be specific about ONE thing — ideally the Sequoia call at 2:00 PM or whatever is most time-sensitive. Something like: "Hey! I see that Sequoia call at 2:00. Want to bounce some ideas around before then?" — that energy, that specificity, that brevity. One or two sentences. Go.`;

    const textRes = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "user", content: greetingPrompt },
      ],
    });

    const greetingText = textRes.choices[0]?.message?.content ?? "Hey, I'm here. What are we working on?";

    res.write(`data: ${JSON.stringify({ type: "transcript", data: greetingText })}\n\n`);

    const ttsStream = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "nova", format: "pcm16" },
      messages: [
        {
          role: "user",
          content: `Say this naturally, like you're talking to a friend — warm and unhurried: "${greetingText}"`,
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
