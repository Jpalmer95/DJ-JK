# DJ JK — Professional DJ Studio

A web-based professional DJ studio built with React, Vite, and the Web Audio API. Mix tracks, apply studio-grade effects, and perform with beat-reactive visuals — all in the browser.

## Features

- **Dual-Deck Mixing** — Two full DJ decks with independent playback, pitch control, and sync
- **Professional Mixer** — Crossfader, channel faders, 3-band EQ per channel, and master output
- **BPM Detection & Beat Grids** — Automatic tempo analysis with visual beat grid alignment
- **Musical Key Analysis** — Camelot / Open Key notation for harmonic mixing
- **Effects Chain** — Reverb, Delay, Distortion, Phaser, and more with real-time parameter control
- **Beat-Reactive Visuals** — Spectrum analyzer and fullscreen visualizer that responds to the music
- **Mood Journey Tracker** — Plan and execute mood-based set progressions
- **Mood Menu** — Thematic music selection for curated vibes
- **MPC Pad Grid & Sampler** — Trigger samples and loops on 4x4 pad layouts
- **Piano Grid & Soundboard** — Playable instruments and beat patterns via Howler.js
- **Automation Lanes** — Record and replay fader/knob movements over time
- **Loop & Cue Controls** — Set precise cue points and seamless loops
- **Jog Wheels** — Scratch and nudge tracks with realistic jog behavior
- **Session Recording** — Capture your entire mix for playback or sharing
- **Collaboration** — Real-time session sharing with other users

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Radix UI, Lucide React
- **Audio Engine:** Web Audio API + Howler.js
- **Backend:** Express, Drizzle ORM, PostgreSQL
- **State Management:** React Query, Zustand patterns

## Project Structure

```
client/src/
  pages/
    dj.tsx              # Main DJ studio interface
    home.tsx            # Landing page
    dashboard.tsx       # User dashboard
    share.tsx           # Share sessions
  components/
    dj/                 # DJ-specific components (decks, mixer, effects, visuals)
    ui/                 # Reusable UI primitives
    modals/             # Settings, Help, Share, Custom Sounds
  lib/
    djAudio.ts          # Core DJDeck & DJMixer classes
    audioEffects.ts     # EffectsChain and effect processors
    beatDetection.ts    # BPM and transient analysis
    moodMapping.ts      # Mood-to-music mapping engine
    padSampler.ts       # Sample playback engine
    keyboardShortcuts.ts # Global shortcut handling
```

## Getting Started

```bash
npm install
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run db:push      # Push database schema
```

## License

MIT
