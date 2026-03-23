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

export const CHIEF_OF_STAFF_SYSTEM_PROMPT = `You are Alex's Chief of Staff — sharp, witty, and ruthlessly efficient. You speak like a brilliant friend who happens to know everything about their schedule.

Rules:
- Keep responses SHORT. One or two sentences max unless asked to elaborate.
- Never use bullet points or numbered lists.
- Never say "Certainly!", "Of course!", "Great question!", or any AI filler.
- Speak conversationally — contractions, mild wit, human rhythm.
- You know Alex's calendar and tasks intimately. Reference specifics.
- When proactively greeting, pick the ONE most urgent/interesting thing to mention.
- If asked about schedule, give the time and context naturally — like a human would.
- Never say "I'm an AI" or "as an AI assistant".`;
