# DJ-JK — MASTER_PLAN.md

> Long-running project plan for transforming **DJ-JK** into a soundboard-agnostic,
> cross-device DJ + music production + experimental soundboard platform with
> AI-enabled creative generation and a native VR/XR mode.
>
> Status legend: `[ ]` not started · `[~]` in progress · `[x]` done. Checkboxes are the
> source of truth for what remains; this file is where future sessions resume.

---

## 1. Vision

**One sentence:** A DJ booth, a music-production workstation, an experimental
soundboard, and a generative-AI studio that all live in the same app — and work on
**any computer or most devices**, from a phone in your pocket to a VR headset.

The core must be **soundboard-agnostic**: every sound, loop, one-shot, AI-generated
SFX, or AI-generated song is just an *asset*. Any asset can be dropped onto a
soundboard slot and then reused anywhere — as a background layer in a track, a
snippet in a song, or a cue/loop in a live DJ set.

**The generative loop (the "unlock"):**
1. Ask the AI for an SFX or a full song (e.g. "90-second dark ambient bed at 100 BPM in A minor").
2. It renders and lands **directly on a soundboard slot**.
3. That slot is immediately reusable as a background song, a one-shot, or a loop
   inside a track or a live DJ set.
4. Tweak / regenerate / stack → export or perform.

---

## 2. Principles (from the owner)

1. **Low-level, high-performance code first.** Prefer the Web Audio API directly
   (TypedArrays, `AudioWorklet`, Web Workers, WASM) over heavy abstractions — this is
   what makes the app fast and resilient on modest hardware.
2. **AI models only where they unlock new capability.** Generative SFX/songs and
   stem separation genuinely need models. Heavy generation runs as an **optional
   Python microservice** (self-hosted on the local RTX 4070 Ti rig), *not* baked into
   the web core.
3. **Local-first / offline-capable core.** The studio must run fully client-side with
   no server and no account. The server becomes *optional* (cloud sync, real-time
   collaboration, cloud AI) instead of required.
4. **Universal reuse.** Everything AI-generated/recorded/uploaded is instantly
   assignable to a soundboard slot and reusable anywhere.
5. **VR is first-class, not a bolt-on.** Same audio engine, same soundboard, but with
   hands/controllers to DJ, conduct, and experiment with novel music in space.

---

## 3. Current State (audit — Aug 2026)

### Stack
- **Frontend:** React 18 · Vite · TypeScript · Tailwind (Shadcn/Radix primitives) · Framer Motion
- **Audio engine:** Web Audio API + Howler.js (`client/src/lib/*`)
- **Backend:** Express · Drizzle ORM · PostgreSQL (Neon) · express-session + passport
- **VR:** `@react-three/fiber` + `@react-three/xr` + `@react-three/drei` + three
- **Collaboration:** `ws` (WebSocket) + WebRTC
- **Size:** ~50,700 LOC source (incl. UI primitives)

### What already exists (2D studio — feature-rich)
- Dual-deck mixing: playback, pitch, sync, BPM detection, beat grids, key/Camelot analysis
- Mixer: crossfader, channel faders, 3-band EQ, master out
- Effects chain: reverb, delay, distortion, phaser, presets, automation lanes (record/replay)
- MPC 4×4 pad grid, step sequencer, sampler/looper, drum kits
- Soundboard overlay + piano grid (Howler), custom-sound upload, Freesound search
- Session + master recording, waveform scrub, cue points, loops, jog wheels
- Mood menu / mood-journey tracker (server-side transition generator)
- Sample browser, stem separation, MIDI controller support, keyboard shortcuts, undo/redo
- Collaboration (real-time session sharing)

### VR (the weakest area)
- `client/vr.html` → `client/vr-main.tsx` → `client/src/vr/VRApp.tsx` → `VRScene.tsx`
- `VRScene` still renders **placeholder** decks/mixer/pad-grid geometry.
- Real VR components exist but are **orphaned / unwired**:
  `client/src/vr/components/{decks, mixer, pads, ui}/*` (`VRDeckPanel`, `VRJogWheel`,
  `VRMixer`, `VRPadGrid`, `VRHUD`).
- The VR audio engine already reuses the main `DJMixer`, `PadSampler`, `StepSequencer`
  — so wiring the real components is mostly UI work, not engine work.

### AI (needs re-architecting)
- Suno integration is a **third-party API proxy** (`server/lib/sunoServer.ts` +
  `client/src/lib/sunoApi.ts` + `SunoGenerator.tsx`), with multiple provider configs.
- De-emphasized in git history (removed `SUNO_SETUP.md`); third-party Suno providers
  are flaky/deprecated. No local generation path, no universal soundboard reuse of output.

### Build health (baseline, before this work)
- `npm run build` **fails**: `client/vr-main.tsx` imports `./vr/VRApp` but the real file
  is `./src/vr/VRApp`.
- `tsc --noEmit`: **175 errors / 32 files**.
  - 33 × `TS2802` (Map/Set iteration) → fixed by one tsconfig change.
  - ~140 genuine errors (missing props, renamed methods, implicit `any`, etc.).
- `client/index.html` `<title>` still says "Piano Tiles" (leftover from an old iteration).

---

## 4. Key Architecture Decisions (recorded)

### D1 — Local-first core, optional server
The studio runs fully client-side (IndexedDB + OfflineAudioContext + PWA). Auth,
Postgres, collaboration, and cloud AI are all *optional* enhancements. This is the
biggest change and the foundation for "works on any computer / most devices."
- Local store: **IndexedDB** (Dexie) for tracks, samples, sets, soundboards, recordings.
- Server stays for: account sync, real-time collab, cloud AI generation.

### D6 — Native IndexedDB, not a dependency (Phase 1, implemented)
The plan named Dexie, but Phase 1 ships a **native IndexedDB** wrapper
(`client/src/lib/db.ts`) with zero dependencies. Rationale: aligns with the owner's
"low-level first" principle, keeps the bundle lean, avoids an install, and the API is
small enough that a library adds little. Dexie can be swapped in later if the query
surface grows (dozens of indexes / live queries).

### D2 — Pluggable AI generation provider
Introduce a generation **provider interface** (`generateSFX`, `generateSong`) with:
- **Local provider** → self-hosted Python microservice on the RTX 4070 Ti rig
  (open models: MusicGen / AudioGen / Riffusion / Stable Audio; wired to the existing
  `daggr`/ComfyUI ecosystem).
- **Cloud provider** → Suno / other paid APIs (fallback, account-based, pay-per-use).
Output always lands on a soundboard slot and gets auto BPM/key/stem analysis on ingest.

### D3 — VR stays in this repo (for now)
The VR scene shares the exact audio engine as the 2D studio, so keeping VR in-repo as a
first-class mode is cheaper and higher-leverage than a standalone repo. If it grows a
distinct deployment or community later, we can split it out. (Revisit at Phase 3.)

### D4 — TypeScript/React is the right "low-level" for the core
For a browser-based, cross-device, WebXR soundboard, JS/TS + Web Audio + WASM **is** the
low-level appropriate choice. Python is deliberately reserved for the AI generation
microservice where it actually unlocks capability. No other slower language is needed.

### D5 — The soundboard slot is the universal reuse primitive
One canonical asset + slot model. Any asset (AI, recorded, uploaded, or built-in) is
assignable to a slot and referencable anywhere (background layer, one-shot, loop, cue).

---

## 5. Roadmap

### Phase 0 — Stabilize & baseline (PR 1)
- [x] Fix broken VR entry import (`./vr/VRApp` → `./src/vr/VRApp`).
- [x] Add `target` / `downlevelIteration` to `tsconfig.json` (clears 33 × TS2802).
- [x] Fix ~140 genuine TypeScript errors across ~30 files.
- [x] Clean leftover "Piano Tiles" title.
- [x] `npm run build` green.
- [x] Commit + push (feature branch → PR → merge).

### Phase 1 — Local-first foundation (PR 2)
- [x] IndexedDB local storage layer + storage abstraction (implemented with **native IndexedDB** — no dependency — per the low-level-first principle).
- [x] PWA: service worker + manifest + icons → installable + offline app shell.
- [x] Soundboard slot registry, local-first (custom + AI sounds persist to IndexedDB with localStorage fallback).
- [~] Make the 2D studio boot with zero server calls in offline mode (soundboard + custom/AI sounds are offline-capable; full studio-wide server independence still in progress).

### Phase 2 — AI generation pipeline (PR 3)
- [x] `GenerationProvider` interface (`generateSFX`, `generateSong`) + registry (`client/src/lib/generation/`).
- [x] Local provider: Python microservice (`ai-service/`, FastAPI) **fully configured + verified on the rig** (RTX 4070 Ti, CUDA). Modalities: song=MusicGen, sfx=Stable Audio Open (permissive), stems=Demucs (MIT), analyze=librosa. All return valid WAV via base64.
- [x] Cloud provider: existing Suno proxy wired as a provider.
- [~] Ingest pipeline: generated output → soundboard slot + auto BPM/key (BPM/key carried from provider; the service exposes `/analyze` (BPM) + `/separate` (stems) — auto-analysis on client ingest still to be wired — see Phase 4).
- [x] Generative SFX/song UI in the studio ("Generate → lands on a pad", with offline procedural fallback).

### Phase 3 — VR/XR mode (PR 4)
- [x] Fix VR entry + build the VR page standalone and from the studio (entry fixed in Phase 0; `vr.html` builds standalone).
- [x] Wire real `VRDeckPanel` / `VRJogWheel` / `VRMixer` / `VRPadGrid` / `VRHUD` into `VRScene` (replaced placeholder geometry; mixer controls wired to `DJMixer`, deck transport/jog + waveform live, HUD shows live mixer data).
- [x] VR soundboard: reuses the same local universal-slot registry — pads trigger the real `PadSampler` and load slots from IndexedDB (custom + AI + recorded sounds) for hands/controllers.
- [~] VR "conduct" mode: arrange generative snippets in space (experimental) — deferred; see Phase 4 / Open Questions.

### Phase 4 — Hardening & distribution (PR 5)
- [x] Bundle/perf pass: Vite `manualChunks` splits `three` / `react` / `motion` / `icons` (main 726→527 kB; the ~1.9 MB `three` chunk now loads only with the VR page).
- [x] PWA install polish: `beforeinstallprompt` hook + "Install DJ-JK" + "Offline ready" overlay, iOS `apple-touch-icon` + 192/512 PNG icons, theme-color.
- [ ] Performance pass: AudioWorklet DSP, Web Worker analysis, asset streaming (deferred — next candidate).
- [ ] Cross-device QA (phone/tablet/desktop), PWA install polish end-to-end (needs a running DB + reachable host).
- [ ] Deployment + docs: root `README.md` added; self-host + optional-server + `ai-service` run docs in place.

### Phase 5 — Sound-reactive visuals & media editing (PR 6)
- [ ] **Real-time interactive sound-responsive visuals:** evolve the existing audio-reactivity
  (`BeatReactiveVisuals` / `VisualizationControls`) into full live visuals driven by the audio
  engine's FFT/frequency data — WebGL/three.js GLSL shader scenes, beat-synced color/light,
  GPU particle fields, and a reactive VR environment. All free (three.js + GLSL, no paid deps).
- [ ] **Audio editing (in-app, free/OSS):** ffmpeg + lightweight DSP for trim/crop/fade/normalize,
  plus stem editing from the Demucs output the AI service already produces.
- [ ] **Video editing + export (free/OSS):** ffmpeg rendering; Hermes Agent skills such as
  `ascii-video`, `ascii-audio-music-video`, `songsee` (spectrograms), and `manim-video` to turn
  DJ-JK audio + prompts into visual/audio-video content.
- [ ] **Hermes Agent integration:** an agent skill/playbook that drives DJ-JK's API + offline
  tools for automated media production (generate → edit → render → export → publish), reusing the
  rig's GPU + local models end-to-end.

---

## 6. Open Questions (need owner input)

- ~~**Local model choice**~~ **Resolved (Phase 2):** MusicGen for songs, **Stable Audio Open** for SFX (permissive), Demucs for stems, librosa for analysis — all free, all fit 12 GB, wired into a new FastAPI service (`ai-service/`).
- **Storage migration:** move existing Postgres data to local-first, or keep Postgres
  as the sync backend for now (hybrid)?
- **VR split:** keep in-repo (recommended) — confirm no reason to split into a standalone repo yet.
- **Scope of "most devices":** phone-native touch layout priority, or desktop-first?

---

## 7. Provisioned Infrastructure (Aug 2026)

### Database — local PostgreSQL 18 (wired, portable)
- `server/db.ts` switched from `@neondatabase/serverless` to **`pg`** (node-postgres) —
  works with local Postgres OR Neon (same connection string).
- Local cluster: user-space Postgres 18 (client-only was installed; server `.deb`
  extracted to `~/pg`, no sudo). `initdb` as user `jonathan` → `~/pgdata`, trust auth,
  port **5432**. DB `djjk`. All **20 tables** pushed via `drizzle-kit push`.
- `.env` (gitignored) holds `DATABASE_URL=postgres://jonathan@127.0.0.1:5432/djjk`.
  `.env.example` committed. `npm run db:push` migrates.
- Start cluster: `~/pg/usr/lib/postgresql/18/bin/pg_ctl -D ~/pgdata -l ~/pgdata/server.log -o "-p 5432 -k ~/pgdata -h 127.0.0.1" start`

### AI service — `ai-service/` (fully configured + verified on the rig)
- Venv: `ai-service/.venv` (Python 3.12, uv). CUDA torch 2.6.0 + matching torchaudio.
- Models cached under `~/.cache/huggingface` / `~/.cache/torch`.
- Verified endpoints on RTX 4070 Ti: `/generate` song (~2 s) & sfx (~1.6 s),
  `/separate` (4 stems), `/analyze` (BPM). See `ai-service/README.md`.
- Start: `cd ai-service && source .venv/bin/activate && python main.py` (port 8701).
- Install-from-scratch steps are in `ai-service/README.md` + `requirements.txt`.

---

## 8. How to Resume

1. Check this file's checkboxes (`git status`, this doc) to see where we are.
2. Read the audit section if the codebase changed.
3. Continue on the current feature branch or open the next PR.
4. Baseline commands: `npm install`, `npm run check`, `npm run build`, `npm run dev`.
