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

## Key Features — Voice AI Assistant

- **Pulsing Orb UI**: 140px centered orb with Framer Motion spring physics
- **Voice States**: IDLE (slow pulse), LISTENING (volume-reactive), THINKING, SPEAKING (rapid shimmer)
- **Barge-in**: Click orb while AI is speaking to immediately interrupt and record
- **Proactive Greeting**: On load, fetches user context and AI speaks a proactive brief
- **Speech-to-Speech**: gpt-audio with PCM16 streaming (Web Audio API playback, no TTS loop)
- **Text fallback**: gpt-5-mini for text-only responses
- **Mock Data**: Calendar events and tasks in `artifacts/api-server/src/data/mockData.ts`

## API Endpoints

- `GET /api/assistant/context` — Returns mock calendar/task context
- `POST /api/openai/proactive-greeting` — SSE stream: text greeting → TTS audio
- `POST /api/openai/conversations` — Create conversation
- `GET /api/openai/conversations/:id` — Get conversation with messages
- `POST /api/openai/conversations/:id/voice-messages` — SSE: audio in → transcript + audio out
- `POST /api/openai/conversations/:id/messages` — SSE: text in → text out

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Auto-set by Replit AI Integration
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Auto-set by Replit AI Integration
- `DATABASE_URL` — Auto-set by Replit PostgreSQL

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with voice assistant routes.
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/integrations-openai-ai-server`

### `artifacts/voice-assistant` (`@workspace/voice-assistant`)

React + Vite voice-first UI. Features:
- `src/hooks/use-assistant.ts` — Main voice state machine (idle/listening/thinking/speaking)
- `src/hooks/use-audio-volume.ts` — Real-time mic volume for orb animation
- `src/components/Orb.tsx` — Animated orb with Framer Motion
- `src/components/Transcript.tsx` — Chat transcript
- `src/lib/audio-queue.ts` — PCM16 streaming audio playback via Web Audio API

### `lib/db` (`@workspace/db`)

Database: `conversations` and `messages` tables.

### `lib/integrations-openai-ai-server` (`@workspace/integrations-openai-ai-server`)

Server-side OpenAI client + audio helpers (voiceChatStream, TTS, STT).

### `lib/integrations-openai-ai-react` (`@workspace/integrations-openai-ai-react`)

React hooks for voice recording + audio playback.
