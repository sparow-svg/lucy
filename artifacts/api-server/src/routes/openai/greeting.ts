import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildSystemMessage, buildRuntimeContext, USER_PROFILE } from "../../data/mockData.js";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    // Determine time-of-day greeting
    const hour = new Date().getUTCHours();
    const timeGreeting =
      hour >= 5 && hour < 12  ? `Good morning, ${USER_PROFILE.firstName}!` :
      hour >= 12 && hour < 17 ? `Good afternoon, ${USER_PROFILE.firstName}!` :
      hour >= 17 && hour < 21 ? `Good evening, ${USER_PROFILE.firstName}!` :
                                `Hey, ${USER_PROFILE.firstName}!`;

    const systemMsg = buildSystemMessage();

    const stream = await openai.chat.completions.create({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "nova", format: "pcm16" },
      messages: [
        {
          role: "system",
          content: `${systemMsg}

GREETING INSTRUCTION: ${USER_PROFILE.firstName} just activated you by saying your name. Open with "${timeGreeting}" then add one short, natural sentence that invites them to talk — like a warm colleague who just looked up from their desk. Do not reference schedules or tasks unless you have data about them. Do not say anything generic like "How can I help?" — keep it personal and brief.`,
        },
        { role: "user", content: `Hey Lucy` },
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
