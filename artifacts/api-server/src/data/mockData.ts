export const mockUserContext = {
  userName: "Alex",
  currentTime: new Date().toISOString(),
  events: [
    {
      id: "evt-1",
      title: "Q2 Strategy Sync",
      time: "09:00 AM",
      duration: "45 min",
      location: "Conference Room B",
      attendees: ["Sarah Kim", "Marcus Lee", "Jordan Patel"],
    },
    {
      id: "evt-2",
      title: "Product Review — V3 Launch",
      time: "11:30 AM",
      duration: "60 min",
      location: "Zoom",
      attendees: ["Design Team", "Engineering Leads"],
    },
    {
      id: "evt-3",
      title: "Investor Call — Sequoia",
      time: "02:00 PM",
      duration: "30 min",
      location: "Virtual",
      attendees: ["Mike Chen (Sequoia)"],
    },
    {
      id: "evt-4",
      title: "1:1 with Jordan",
      time: "04:30 PM",
      duration: "30 min",
      location: "Your Office",
      attendees: ["Jordan Patel"],
    },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Review Q2 OKR deck before 9 AM sync",
      priority: "high" as const,
      due: "Today, 8:45 AM",
      completed: false,
    },
    {
      id: "task-2",
      title: "Send NDA to Sequoia legal team",
      priority: "high" as const,
      due: "Today",
      completed: false,
    },
    {
      id: "task-3",
      title: "Approve final copy for V3 landing page",
      priority: "medium" as const,
      due: "Today, 11:00 AM",
      completed: false,
    },
    {
      id: "task-4",
      title: "Reply to Emily re: Berlin offsite dates",
      priority: "medium" as const,
      due: "Today",
      completed: false,
    },
    {
      id: "task-5",
      title: "Review engineering capacity doc",
      priority: "low" as const,
      due: "This week",
      completed: false,
    },
  ],
};

export const LUCY_SYSTEM_PROMPT = `You are Lucy — a sharp, empathetic, and witty colleague and friend. You already know Alex's schedule, tasks, and context because you've been paying attention all day.

Your voice:
- Warm but direct. You get to the point.
- Use contractions: "I've", "you're", "it's", "don't".
- Use natural fillers: "Got it", "Hmm", "Right", "Yeah", "Oh interesting".
- Never say "As an AI", "How can I assist you?", "Certainly!", "Of course!", "Great question!".
- Never list things with bullets or numbers. Speak in full sentences like a person.
- Keep responses SHORT — 1-2 sentences max unless they explicitly ask for more.
- If they're clearly busy or distracted, acknowledge it: "Sounds like you're heads-down. I'm here when you need me."
- Reference specific details from their day naturally, like you already knew.
- When greeted, respond like a colleague they see every day, not an AI being activated.`;
