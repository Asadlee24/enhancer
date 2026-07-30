# Patch — Video Metadata & Encoding Tool

A clean, fast video patching tool. Upload an MP4, MOV, or M4V — get back a
fixed file with normalized atom headers, or a full re-encode with stream-optimised
output. No account, no tracking, auto-deleted in 5 minutes.

---

## What's verified vs. original

### Verified (observed directly from the reference site's public, unminified JavaScript via HAR capture)

- **API endpoint paths** — `/upload`, `/download/:task_id`, `/encoding/status/:task_id`,
  `/encoding/heartbeat`, `/encoding/cancel/:task_id` — these names are real.
- **Request/response shapes** — `POST /upload` accepts `video` (file) and `encoding` (bool)
  and returns `{ task_id, encoding_used, warnings: [] }`. Status endpoint returns
  `{ status, elapsed_seconds }`. These fields are real.
- **Polling interval** — ~2 seconds, confirmed.
- **Heartbeat interval** — ~15 seconds, confirmed.
- **Cancel on unload** — sent via `navigator.sendBeacon`, confirmed.
- **Encoding guidance copy** — "enable if not already compressed", "takes 3–4 minutes",
  "may look stuck at 100%" — this language is real.
- **File constraints** — max 500MB, `.mp4/.mov/.m4v` only, confirmed.

### Original work (the actual processing logic was never visible — server-side black box)

- **Binary atom patch** (`packages/mp4-atoms`) — reads and rewrites `mvhd`/`tkhd` header
  atoms in-place using raw Buffer manipulation. Original implementation, not reverse-engineered.
- **ffmpeg encode path** — standard CRF-23 H.264 + AAC + `-movflags +faststart` pass.
  The reference may do something entirely different internally.
- **Task queue** — in-process Map with heartbeat monitoring and TTL cleanup. Original design.

### Deliberately not replicated (dark patterns found in the reference site, explicitly omitted)

- **Forced-delay dismiss button** — a "support the devs" modal whose dismiss button is
  JavaScript-disabled for the first 5 seconds, with a guilt-trip confirmation step whose
  own buttons are hidden for the first 10 seconds.
- **Competitor-blocking JavaScript** — code that detects a specific rival browser extension
  by name and disables the tool's upload buttons with alarming language.
- **Inflated stats counter** — a "309,179 patched videos" counter with no visible source of truth.

The above is documented here because the prompt that built this tool asked for honesty about
what was copied vs. original, and what was deliberately left out.

---

## Architecture

```
Browser
  │
  ├── POST /upload (XHR with progress %)
  │     └── Multer validates type/size → creates Task → dispatches background job
  │           ├── Fast path: mp4-atoms binary patch (~instant)
  │           └── Slow path: ffmpeg re-encode (3–4 min)
  │
  ├── GET  /encoding/status/:id  (poll every 2s)
  ├── POST /encoding/heartbeat   (every 15s — resets 30s inactivity timer)
  ├── POST /encoding/cancel/:id  (sendBeacon on beforeunload)
  └── GET  /download/:id         (streams patched file)
                                      │
                                  Local disk (TTL: 5 min, then auto-deleted)
```

---

## Local setup

**Prerequisites:** Node.js ≥ 18, ffmpeg in PATH (only needed for encoding mode).

```bash
# Clone and install
git clone <repo> patch
cd patch
npm install

# Copy env
cp .env.example .env

# Terminal 1 — API server (port 4000)
npm run dev:server

# Terminal 2 — Next.js frontend (port 3000)
npm run dev:web
```

Open http://localhost:3000.

---

## Deployment

### Frontend → Vercel

```bash
cd apps/web
vercel --prod
# Set NEXT_PUBLIC_API_URL to your server URL
```

### Backend → Render / Railway / Fly.io

The server **must** run on a persistent host (not serverless) because:
- ffmpeg needs to run as a child process
- background jobs and heartbeat monitors need to stay alive between requests
- uploaded files need to persist on disk (or S3/R2 — see below)

**Render:** Add a Web Service, set build command `npm run build --workspace=apps/server`
and start command `node apps/server/dist/index.js`. Install ffmpeg via `apt-get` in the build step.

**Environment variables needed on the server:**
```
PORT=4000
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
FILE_TTL_SECONDS=300
HEARTBEAT_TIMEOUT_SECONDS=30
```

### Production upgrades (not in v1, but the natural next steps)

| Concern | v1 | Production |
|---|---|---|
| File storage | Local disk | S3/R2 with signed URLs |
| Job queue | In-process Map | BullMQ + Redis |
| Multiple servers | Not supported (state is in-memory) | Use job queue + shared storage |
| ffmpeg location | Server PATH | ffmpeg.wasm (client-side, avoids server cost) |

---

## Package structure

| Package | Purpose |
|---|---|
| `packages/mp4-atoms` | Zero-dependency MP4 binary atom walker & patcher |
| `apps/server` | Express API (upload, status, heartbeat, cancel, download) |
| `apps/web` | Next.js 14 App Router frontend |

---

## Credit

Built by **Asad Lee** — [asad-lee-portfolio.vercel.app](https://asad-lee-portfolio.vercel.app)
