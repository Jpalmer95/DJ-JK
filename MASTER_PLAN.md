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
- [ ] Fix broken VR entry import (`./vr/VRApp` → `./src/vr/VRApp`).
- [ ] Add `target` / `downlevelIteration` to `tsconfig.json` (clears 33 × TS2802).
- [ ] Fix ~140 genuine TypeScript errors across ~30 files.
- [ ] Clean leftover "Piano Tiles" title.
- [ ] `npm run build` green.
- [ ] Commit + push (feature branch → PR → merge).

### Phase 1 — Local-first foundation (PR 2)
- [ ] IndexedDB local storage layer (Dexie) + storage abstraction (local vs server).
- [ ] PWA: service worker + manifest → installable + offline.
- [ ] Soundboard slot registry, local-first.
- [ ] Make the 2D studio boot with zero server calls in offline mode.

### Phase 2 — AI generation pipeline (PR 3)
- [ ] `GenerationProvider` interface (`generateSFX`, `generateSong`) + registry.
- [ ] Local provider: Python microservice (MusicGen/AudioGen) on RTX rig; FastAPI + docs.
- [ ] Cloud provider: existing Suno proxy as a provider.
- [ ] Ingest pipeline: generated output → soundboard slot + auto BPM/key/stem analysis.
- [ ] Generative SFX/song UI in the studio ("Generate → lands on a pad").

### Phase 3 — VR/XR mode (PR 4)
- [ ] Fix VR entry + build the VR page standalone and from the studio.
- [ ] Wire real `VRDeckPanel` / `VRJogWheel` / `VRMixer` / `VRPadGrid` / `VRHUD` into `VRScene`.
- [ ] VR soundboard: reuse the same slot registry, grab/trigger pads with hands/controllers.
- [ ] VR "conduct" mode: arrange generative snippets in space (experimental).

### Phase 4 — Hardening & distribution (PR 5)
- [ ] Performance pass: AudioWorklet DSP, Web Worker analysis, asset streaming.
- [ ] Cross-device QA (phone/tablet/desktop), PWA install polish.
- [ ] Deployment + docs (self-host + optional server).

---

## 6. Open Questions (need owner input)

- **Local model choice** for Phase 2: MusicGen (full songs) vs AudioGen (SFX) vs both,
  and whether to use the existing daggr/ComfyUI wiring or a new FastAPI service.
- **Storage migration:** move existing Postgres data to local-first, or keep Postgres
  as the sync backend for now (hybrid)?
- **VR split:** keep in-repo (recommended) — confirm no reason to split into a standalone repo yet.
- **Scope of "most devices":** phone-native touch layout priority, or desktop-first?

---

## 7. How to Resume

1. Check this file's checkboxes (`git status`, this doc) to see where we are.
2. Read the audit section if the codebase changed.
3. Continue on the current feature branch or open the next PR.
4. Baseline commands: `npm install`, `npm run check`, `npm run build`, `npm run dev`.
