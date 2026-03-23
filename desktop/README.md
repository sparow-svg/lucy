# Lucy Desktop

Electron wrapper for the Lucy voice-first AI assistant.

All voice, memory, nudges, and conversation logic live in the centralized web backend.
This wrapper loads Lucy in a native macOS/Windows window.

## Setup

```bash
cd desktop
npm install
```

## Development (connects to local dev server)

```bash
cd desktop
LUCY_DEV_URL=http://localhost:5173 NODE_ENV=development npm start
```

## Production (connects to your deployed Lucy app)

Edit `src/main.js` and set `LUCY_URL` to your deployed Replit app URL, then:

```bash
cd desktop
LUCY_URL=https://your-lucy-app.replit.app npm start
```

## Build distributable

macOS:
```bash
npm run build:mac
```

Windows:
```bash
npm run build:win
```

Outputs are in the `dist/` folder.

## Features

- Native macOS titlebar (hidden inset)
- Frosted glass vibrancy effect (macOS)
- Microphone permission granted automatically
- System notifications for nudges (fired from Lucy's sidebar or via voice)
- External links open in the system browser
- Orb blending effect identical to the web version

## Nudge notifications

When Lucy creates a nudge (via sidebar or voice command), the desktop app fires
a native OS notification. The web app detects `window.lucyDesktop.isDesktop`
and calls `window.lucyDesktop.sendNudge(title, body)` which is bridged to
Electron's `Notification` API via the preload script.
