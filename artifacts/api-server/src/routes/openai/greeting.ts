import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildSystemMessage, getTimeGreeting } from "../../data/mockData.js";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const firstName: string = (req.body?.firstName as string) || "there";
    const timeGreeting = getTimeGreeting(firstName);
    const systemMsg = buildSystemMessage(firstName);

    const stream = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "nova", format: "pcm16" },
      messages: [
        {
          role: "system",
          content: `${systemMsg}

GREETING INSTRUCTION — read carefully and follow exactly:
This is the ONE AND ONLY greeting for this entire session. You will never greet the user again.
Your entire response must be EXACTLY two sentences — no more, no less:
Sentence 1: "${timeGreeting}"
Sentence 2: "What's up for today?"
Output only those two sentences. Do not add anything else. Do not vary the wording. Stop immediately after sentence 2.`,
        },
        { role: "user", content: "Hey Lucy" },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;
      if (delta?.audio?.transcript) {
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
