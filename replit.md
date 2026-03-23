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
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI (via Replit AI Integrations) — gpt-5-mini for text, gpt-audio for TTS/voice

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── voice-assistant/    # React + Vite voice-first AI assistant
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-openai-ai-server/  # OpenAI server-side integration
│   └── integrations-openai-ai-react/   # OpenAI React hooks
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Key Features — Voice AI Assistant (Lucy)

### Auth & Accounts
- **Sign Up**: firstName (required) + password (required) + email (optional)
- **Sign In**: firstName or email + password
- **Session cookies**: HTTP-only, 30-day expiry, stored in PostgreSQL `session` table
- **Session restore**: on app mount, GET /api/auth/me checks active session
- **Sign Out**: destroys session, clears cookie

### Voice Interface
- **Pulsing Orb UI**: centered orb with Framer Motion spring physics
- **Voice States**: DORMANT → wake-word → LISTENING → THINKING → SPEAKING
- **Wake word**: say "Lucy" to activate; "Lucy" again to resume after pause
- **Barge-in**: mic volume above threshold while speaking interrupts AI
- **Auto-pause**: 10s silence triggers pause; 45s session timeout ends session
- **Proactive Greeting**: time-of-day greeting on session start (once per session)
- **Speech-to-Speech**: gpt-audio with PCM16 streaming (Web Audio API)
- **Eye background**: `/bg-eye.jpeg` with blink animation

### Conversations
- Per-account persistent conversations saved to PostgreSQL
- ChatGPT-style left sidebar with conversation list (most recent first)
- "New conversation" button starts fresh (new convId, full remount of Home)
- Delete conversation (with cascade on messages)
- Conversations linked to userId via FK

### Tasks / Reminders
- CRUD tasks per account: add, view, toggle complete, delete
- Tasks tab in the sidebar (alongside Conversations)
- Pending tasks injected into AI system message each turn so Lucy can reference them

### Header & Navigation
- Landing: "Lucy" wordmark + "Sign in" link + "Get started" (sign up) button
- Assistant: sidebar toggle + "Lucy" wordmark + firstName with dropdown (Sign Out)
- Sidebar: dark translucent overlay, Conversations/Tasks tabs, user name + sign out

## Database Schema

```
users: id, first_name, password_hash, email (unique, optional), created_at
conversations: id, user_id (FK→users), title, created_at
messages: id, conversation_id (FK→conversations), role, content, created_at
tasks: id, user_id (FK→users), text, completed, created_at, updated_at
session: sid, sess, expire  (connect-pg-simple table)
```

## API Endpoints

### Auth
- `POST /api/auth/register` — { firstName, password, email? } → { id, firstName, email }
- `POST /api/auth/login` — { identifier (name or email), password } → { id, firstName, email }
- `POST /api/auth/logout` — destroys session
- `GET /api/auth/me` — returns current user (401 if not authed)

### Tasks
- `GET /api/tasks` — list user's tasks (auth required)
- `POST /api/tasks` — create task: { text }
- `PATCH /api/tasks/:id` — update: { text?, completed? }
- `DELETE /api/tasks/:id` — delete task

### Voice / Conversations
- `GET /api/openai/conversations` — list user's conversations
- `POST /api/openai/conversations` — create conversation { title }
- `GET /api/openai/conversations/:id` — get with messages
- `DELETE /api/openai/conversations/:id` — delete conversation
- `POST /api/openai/conversations/:id/voice-messages` — SSE: audio → transcript + audio
- `POST /api/openai/conversations/:id/messages` — SSE: text → text
- `POST /api/openai/proactive-greeting` — SSE: one-time session greeting

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Auto-set by Replit AI Integration
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Auto-set by Replit AI Integration
- `DATABASE_URL` — Auto-set by Replit PostgreSQL
- `SESSION_SECRET` — Session signing secret (falls back to dev value if not set)

## Key Files

- `artifacts/api-server/src/data/mockData.ts` — Lucy persona + system prompt builder
- `artifacts/api-server/src/routes/auth.ts` — auth routes
- `artifacts/api-server/src/routes/tasks.ts` — task CRUD
- `artifacts/api-server/src/lib/db-migrate.ts` — startup migration (creates session table)
- `artifacts/voice-assistant/src/context/AuthContext.tsx` — auth state provider
- `artifacts/voice-assistant/src/hooks/use-assistant.ts` — voice state machine
- `artifacts/voice-assistant/src/components/ConversationSidebar.tsx` — sidebar
- `artifacts/voice-assistant/src/components/TasksPanel.tsx` — task list UI
- `artifacts/voice-assistant/src/components/AuthModal.tsx` — sign in/sign up modal
