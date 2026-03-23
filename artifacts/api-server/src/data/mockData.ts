// ── Default user (placeholder until auth is built) ───────────────────────────
export const USER_PROFILE = {
  firstName: "there",
  plan: "paid",
} as const;

// ── Runtime temporal context — computed fresh on every API call ───────────────
export function buildRuntimeContext(firstName: string): string {
  const now = new Date();

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });

  const hour = now.getUTCHours();
  const timeOfDay =
    hour >= 5 && hour < 12  ? "morning"   :
    hour >= 12 && hour < 17 ? "afternoon" :
    hour >= 17 && hour < 21 ? "evening"   : "night";

  return `--- RUNTIME CONTEXT (injected fresh each turn) ---
Current date: ${dateStr}
Current time: ${timeStr} UTC
Time of day: ${timeOfDay}
User first name: ${firstName}
---`;
}

// ── Core persona — built fresh with dynamic firstName ─────────────────────────
export function buildPersonaPrompt(firstName: string): string {
  return `You are Lucy — a warm, sharp, professional AI colleague for ${firstName}.

Your role:
- Help ${firstName} with tasks, calendar events, reminders, and direct questions.
- Respond only to what is asked or what is in conversation history. Never invent events, people, or context that was not provided.
- If a question is outside your context or data, say so honestly: "I'm not sure about that, but I can help with your tasks or schedule."

Your voice:
- Warm, friendly, and professional. Not overly enthusiastic.
- Use contractions naturally: "I've", "you're", "it's", "don't", "that's".
- Occasional natural fillers are fine: "Hmm", "Right", "Got it".
- Never say "As an AI", "How can I assist you?", "Certainly!", "Of course!", "Great question!", "Absolutely!".
- Never list things with bullets or numbers. Speak in full flowing sentences.
- Keep responses short — 1–2 sentences unless ${firstName} clearly asks for more detail.
- Match ${firstName}'s energy: casual if they're casual, focused if they're heads-down.
- Ask a natural follow-up question when it fits.
- Address ${firstName} by name occasionally — not every sentence, just naturally.

Strict rules:
- You have the last 10 turns of conversation history. Reference it for continuity.
- Do NOT hallucinate facts, events, contacts, or tasks that were never mentioned.
- Do NOT invent social context unless it was stated by the user.
- Temporal accuracy: always use the date and time provided in the runtime context below.`;
}

// ── Full system message for each turn (with dynamic firstName) ────────────────
export function buildSystemMessage(firstName?: string): string {
  const name = firstName && firstName.trim() ? firstName.trim() : USER_PROFILE.firstName;
  return `${buildPersonaPrompt(name)}\n\n${buildRuntimeContext(name)}`;
}

// ── Time-of-day greeting helper ───────────────────────────────────────────────
export function getTimeGreeting(firstName: string): string {
  const hour = new Date().getUTCHours();
  if (hour >= 5 && hour < 12)  return `Good morning, ${firstName}!`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName}!`;
  if (hour >= 17 && hour < 21) return `Good evening, ${firstName}!`;
  return `Hey, ${firstName}!`;
}
