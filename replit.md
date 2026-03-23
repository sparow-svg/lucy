# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: express-session + connect-pg-simple + bcrypt (session cookies, no JWT)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI (via Replit AI Integrations) — gpt-audio for voice speech-to-speech
- **Desktop**: Electron wrapper in `desktop/` (loads deployed web app)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable web applications
│   ├── api-server/         # Express API server
│   └── voice-assistant/    # React + Vite voice-first AI assistant (Lucy)
├── desktop/                # Electron desktop wrapper (Mac/Windows)
│   ├── src/main.js         # Electron main process
│   ├── src/preload.js      # Context bridge (lucyDesktop API)
│   └── package.json        # Electron + electron-builder
├── lib/                    # Shared libraries
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/  # OpenAI server-side integration
├── scripts/
├── pnpm-workspace.yaml
└── replit.md
```

## Key Features — Lucy (Living Colleague)

### Voice-First Interface
- **No visible transcript** — purely voice. Optional summary panel (bottom-right chat bubble icon)
- **Orb UI**: centered sphere with `mix-blend-mode: screen` to blend with eye background
- **Wake word**: say "Lucy" to activate; "Lucy" again to resume after pause
- **Single greeting per conversation**: "Good [morning/afternoon/evening], [firstName]. What's up for today?" — fires exactly once. Never repeats on session resume, session timeout, or conversation reload.
- **Silence guard**: if user never speaks (RMS never crosses SPEECH_THRESHOLD), audio is discarded — API never called for silence
- **Auto-pause**: 10s after last speech (seeded from wake-word activation), session pauses
- **Session timeout**: 45s of total inactivity ends the session completely
- **Barge-in**: speaking while Lucy responds interrupts playback immediately
- **Eye background**: `/bg-eye.jpeg` with eyelid blink animation

### Auth & Accounts
- **Sign Up**: firstName (required) + email (required) + password
- **Sign In**: email + password only
- **Session cookies**: HTTP-only, stored in PostgreSQL `session` table
- **Profile dropdown**: top-right, shows name, nudges, connected services, sign out

### Conversations
- Per-account persistent conversations saved to PostgreSQL
- Sidebar (left, frosted glass): conversations list + nudges panel + "Lucy remembers…" panel
- Clicking a past conversation loads full message history (no greeting on resume)
- New conversation: fresh convId, full remount, greeting fires on first activation
- Rename (double-click title), delete

### Nudges
- DB table: `nudges` (id, userId, text, dueAt, dismissed, createdAt)
- API: GET/POST/PATCH dismiss / DELETE
- Sidebar panel shows active nudges; dismissable
- Profile dropdown shows up to 4 active nudges with dismiss
- Injected into AI system message; Lucy mentions contextually (once each, never repeat)
- Desktop: fires native OS notification when nudge is created (via Electron bridge)

### Memory
- DB table: `memories` (id, userId, text, createdAt)
- "Lucy remembers…" panel in sidebar with example placeholder items
- Injected into AI system message; referenced naturally when relevant

### Connected Services
- DB table: `connected_services` (id, userId, serviceName, connectedAt)
- API: `GET /api/services` → list connected service names; `POST /api/services/:name/connect`; `DELETE /api/services/:name/disconnect`
- Allowed services: `google`, `outlook`, `gmail`
- Profile panel fetches real status from backend on each open — never reads localStorage
- "Connect" button shown when not connected; "Disconnect" when confirmed from DB
- "Coming soon" label removed; replaced with "Connect" or "X connected" badge

### Activation Nudges (First-Time Onboarding)
- `POST /api/nudges/onboard` — idempotent; checks if any nudge exists for user (incl. dismissed); if none, creates 3 personalized welcome nudges
- Called automatically on every login — safe to call repeatedly; no-op after first run
- Onboarding nudges appear instantly in sidebar and profile panel

### Desktop App (Electron)
- Located in `desktop/`
- Loads deployed Lucy web app URL (or local dev server)
- Native macOS titlebar + vibrancy, Windows NSIS installer
- Mic permission auto-granted
- `window.lucyDesktop.sendNudge(title, body)` → native OS notification
- Build: `npm run build:mac` / `npm run build:win`

## Database Schema

```
users:         id, first_name, email (unique, required), password_hash, created_at
conversations: id, user_id (FK→users), title, created_at
messages:      id, conversation_id (FK→conversations), role, content, created_at
tasks:         id, user_id (FK→users), text, completed, created_at, updated_at
memories:      id, user_id (FK→users), text, created_at
nudges:        id, user_id (FK→users), text, due_at, dismissed, created_at
session:       sid, sess, expire  (connect-pg-simple table)
```

## API Endpoints

### Auth
- `POST /api/auth/register` — { firstName, email, password }
- `POST /api/auth/login` — { email, password }
- `POST /api/auth/logout` — destroys session
- `GET /api/auth/me` — current user (401 if not authed)

### Voice / Conversations
- `GET /api/openai/conversations` — list user's conversations
- `POST /api/openai/conversations` — create conversation
- `GET /api/openai/conversations/:id/messages` — fetch all messages for a conversation
- `DELETE /api/openai/conversations/:id` — delete conversation
- `PATCH /api/openai/conversations/:id` — rename conversation
- `POST /api/openai/conversations/:id/voice-messages` — SSE: audio → transcript + audio
- `POST /api/openai/proactive-greeting` — SSE: one-time greeting

### Memories
- `GET /api/memories` — list user's memories
- `POST /api/memories` — create: { text }
- `DELETE /api/memories/:id` — delete

### Nudges
- `GET /api/nudges` — list active (not dismissed) nudges
- `POST /api/nudges` — create: { text, dueAt? }
- `PATCH /api/nudges/:id/dismiss` — mark dismissed
- `DELETE /api/nudges/:id` — hard delete

## Key Files

- `artifacts/api-server/src/data/mockData.ts` — Lucy persona + system prompt
- `artifacts/api-server/src/routes/openai/voice.ts` — voice SSE + getUserContext()
- `artifacts/api-server/src/routes/nudges.ts` — nudges CRUD
- `artifacts/voice-assistant/src/hooks/use-assistant.ts` — voice state machine (greeting, silence, recording guards)
- `artifacts/voice-assistant/src/pages/Home.tsx` — orb, profile panel, summary panel
- `artifacts/voice-assistant/src/components/ConversationSidebar.tsx` — sidebar with nudges + memory
- `artifacts/voice-assistant/src/App.tsx` — top-level state: conversations, memories, nudges
- `desktop/src/main.js` — Electron main process

## Voice State Machine (use-assistant.ts)

```
DORMANT → [say "Lucy"] → greet() → SPEAKING → IDLE → LISTENING → THINKING → SPEAKING → ...
                                                  ↓ (10s silence)
                                               PAUSED → [say "Lucy"] → resume
                                                  ↓ (45s timeout)
                                               DORMANT
```

**Greeting rules:**
- `hasGreeted` ref resets ONLY when Home remounts (new key = new conversation)
- Never reset in `endSession()` or `pauseSession()`
- Pre-set to `true` for loaded existing conversations (`initialConvId !== null`)

**Silence guard:**
- `hadSpeechInRecording` ref resets on each `doStartListening()`
- Set to `true` when RMS > SPEECH_THRESHOLD during recording
- `doProcessVoice()` returns early (no API call) if `hadSpeechInRecording` is false

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Auto-set by Replit AI Integration
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Auto-set by Replit AI Integration
- `DATABASE_URL` — Auto-set by Replit PostgreSQL
- `SESSION_SECRET` — Session signing secret
