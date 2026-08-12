# DJ-JK — Creative AI Music Production & DJ Studio

A **soundboard-agnostic** DJ booth, music-production workstation, experimental
soundboard, and **generative-AI studio** — all in one app that runs on **any
computer or most devices**, from a phone in your pocket to a **VR headset**.

The core is soundboard-agnostic: every sound, loop, one-shot, AI-generated SFX,
or AI-generated song is just an **asset**. Any asset can be dropped onto a
soundboard slot and reused anywhere — as a background layer in a track, a
snippet in a song, or a cue/loop in a live DJ set.

> Full long-running roadmap + recorded decisions live in **[`MASTER_PLAN.md`](./MASTER_PLAN.md)**.

---

## Features

**2D Studio**
- Dual-deck mixing: playback, pitch, sync, BPM detection, beat grids, key/Camelot analysis
- Mixer: crossfader, channel faders, 3-band EQ, master out
- Effects chain: reverb, delay, distortion, phaser, presets, automation lanes (record/replay)
- MPC 4×4 pad grid, step sequencer, sampler/looper, drum kits
- Soundboard overlay + piano grid, custom-sound upload, Freesound search
- Session + master recording, waveform scrub, cue points, loops, jog wheels
- Mood menu / mood-journey tracker, sample browser, stem separation, MIDI, keyboard shortcuts

**Generative AI (Phase 2)**
- Pluggable `GenerationProvider`: **local** self-hosted models (MusicGen/AudioGen
  via [`ai-service/`](./ai-service)) or **cloud** Suno
- `Generate → lands on a pad` — output is instantly reusable as a one-shot, loop,
  background layer, or song snippet (offline-capable)

**Local-first (Phase 1)**
- Native **IndexedDB** storage (zero deps) with a universal slot model
- **PWA** — installable, offline-capable (service worker + manifest)

**VR / XR (Phase 3)**
- Real VR decks, jog wheels, mixer, pad grid, and HUD wired to the same audio engine
- VR soundboard reuses the local slot registry — trigger your sounds with hands/controllers

---

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 · Vite · TypeScript · Tailwind (Shadcn/Radix) · Framer Motion |
| Audio    | Web Audio API + Howler (`client/src/lib/*`) |
| Backend  | Express · Drizzle ORM · PostgreSQL (Neon) · express-session + passport |
| VR       | `@react-three/fiber` + `@react-three/xr` + drei + three |
| Local storage | Native IndexedDB (`client/src/lib/db.ts`) |
| AI (optional) | Python FastAPI microservice (`ai-service/`, MusicGen/AudioGen) |

---

## Getting started

```bash
npm install
npm run dev          # full-stack dev server
npm run check        # tsc --noEmit
npm run build        # production build (client + server)
npm start            # run the production server
```

The VR experience is a standalone page built from `client/vr.html`.

---

## Generative AI (optional)

The AI pipeline is fully optional — the studio works offline without it.

1. **Start the local service on your rig:**
   ```bash
   cd ai-service && python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt && python main.py
   ```
2. Open the studio → Soundboard → **Generate** → describe a sound. It uses the
   local rig automatically (falls back to Suno or the offline procedural synth).

See [`ai-service/README.md`](./ai-service/README.md) for model choices and env vars.

---

## Deployment

- **Self-hosted (recommended):** build (`npm run build`) and serve `dist/index.js`
  (Express) behind any reverse proxy. PWA assets live in `dist/public/`.
- **Local AI:** run `ai-service/` on a GPU box reachable from the studio.
- **Cloud:** the optional Express server handles accounts, sync, and the Suno proxy.

---

## Project layout

```
client/            React + Vite frontend (studio + VR entry)
  src/lib/db.ts    Native IndexedDB local storage + universal slot model
  src/lib/generation/   Pluggable AI provider pipeline
  src/vr/          VR scene + real VR components
shared/schema.ts   Drizzle + Zod schema (server + client)
server/            Express API + storage (MemStorage / DatabaseStorage)
ai-service/        Optional self-hosted generative-audio microservice
MASTER_PLAN.md     Roadmap, decisions, and live status checkboxes
```

---

## Roadmap status

**Done:** Phase 0 (green build, 175→0 TS errors) · Phase 1 (local-first, PWA)
· Phase 2 (AI pipeline) · Phase 3 (VR wiring + VR soundboard) · DB + AI service provisioned
**Deferred:** full offline boot of every route · ingest stem-analysis · VR
"conduct" mode · Phase 4 hardening (AudioWorklet, cross-device QA)
**Planned:** Phase 5 — sound-reactive visuals + media editing (ffmpeg + Hermes skills)

See [`MASTER_PLAN.md`](./MASTER_PLAN.md) for the full, always-current status.
