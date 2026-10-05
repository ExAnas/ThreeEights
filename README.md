# 8×3 — Three Eights

Arabic-first React/TypeScript app that divides a cycle into Sleep, Work, and Tasks with strict eight-hour gating.

## Included

- React + Redux Toolkit + TypeScript + Vite.
- Absolute timestamp timers that survive reloads and device sleep.
- Web Worker for one-second UI ticks.
- localStorage persistence.
- Light/dark mode.
- Sound and browser notifications.
- Accessible RTL UI and responsive mobile layout.
- Safe undo of only the most recent completion.
- Optional JWT sync API and demo Node/Express server.
- Vitest reducer tests.
- API and design documentation.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Fast timer demo

Create `.env.local`:

```env
VITE_PHASE_DURATION_MS=60000
```

This changes each phase to 60 seconds for testing. Remove it for the real eight-hour behavior.

## Optional sync server

Create `.env` or export:

```bash
export JWT_SECRET='replace-with-a-long-random-secret'
export CORS_ORIGIN='http://localhost:5173'
export PORT=8787
```

Then run:

```bash
npm run server
```

In the frontend environment set:

```env
VITE_SYNC_API_URL=http://localhost:8787
```

The demo server writes `server/data.json`. Do not use the file-based store as-is for production.

## Build and deploy

```bash
npm run test
npm run build
```

Deploy the generated `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, Nginx, S3/CloudFront). The sync API, if used, is deployed separately as a Node service.

For SPA hosts, configure unknown routes to fall back to `index.html`.

## Important timer behavior

Timers are reliable across refresh/suspension because deadlines are absolute timestamps. Web browsers do **not** guarantee that a Service Worker can remain alive for eight hours or wake at an exact local deadline. If exact notifications are required when every browser process is closed, schedule a Web Push notification from the server (or use a native/mobile wrapper).

## Test scenarios

1. Fresh app: Sleep is ready; Work/Tasks are locked.
2. Complete Sleep: Work timer starts for 8h; Work check remains disabled.
3. Reload midway: Work remaining time is recalculated from persisted `endsAt`.
4. Resume after deadline: Work immediately appears ready at `00:00:00`.
5. Attempt early completion: reducer ignores it.
6. Complete Work after deadline: Tasks timer starts.
7. Undo: only the latest completed phase is reopened; downstream timer is cancelled.
8. Reset: all marks and timer are cleared after confirmation.
9. Complete Tasks: cycle ends; starting a new cycle is explicit.
10. API conflict: uploading older state returns HTTP 409.

See `docs/DESIGN.md` and `docs/API.md` for more detail.

## Netlify TypeScript compatibility note

The service-worker notification options use `renotify`, which is supported by browsers but is missing from some TypeScript DOM declarations. The project uses a local intersection type (`NotificationOptions & { renotify?: boolean }`) in `src/lib/notifications.ts`, so Netlify's strict TypeScript build accepts the option without weakening type checking elsewhere.
