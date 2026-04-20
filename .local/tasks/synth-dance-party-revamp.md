# Next-Gen Synth Dance Party Revamp

## What & Why
Transform the existing music studio and DJ mixer into a next-generation synth dance party experience. The current app has solid audio foundations (dual-deck DJ mixer, effects chain, AI generation, recording/sharing) but needs a complete visual overhaul and new soundboard overlay system to feel like a modern, fun, and powerful music production tool.

## Done looks like
- **Neon cyberpunk visual theme** — Dark backgrounds with vibrant neon gradients (cyan, magenta, electric purple), glowing UI elements, and pulsing animations that react to the music
- **Unified single-page DJ dashboard** — Instead of separate Home and DJ pages, one cohesive production workspace with collapsible panels for the synth grid, mixer, soundboard, and effects
- **Sidebar navigation** with quick-access sections: Performance Mode, Mix Studio, Soundboard, Recordings, and Settings
- **Soundboard overlay panel** — A draggable, resizable panel of trigger pads that plays short sound bytes (air horns, drops, vocal chops, etc.) over the current mix. Users can upload their own audio clips or generate them via AI
- **Enhanced synth grid** — The piano grid reimagined as a glowing neon pad matrix (like a Launchpad) with visual ripple effects on press
- **Quick-start beginner mode** — A simplified view with large buttons, preset packs, and guided tooltips that progressively reveals advanced features
- **Advanced mode toggle** — Unlocks the full effects rack, automation lanes, detailed waveform editing, and granular mixer controls
- **Improved recording workflow** — Clear record/stop/save flow with waveform preview before saving, ability to name and tag recordings
- **Responsive layout** — Works well on desktop (full dashboard) and mobile (simplified pad/soundboard view)

## Out of scope
- Backend schema changes (reuse existing models; soundboard bytes stored as sound_samples in existing libraries)
- Authentication system changes
- Changing the core audio engine internals (Web Audio API / Howler.js plumbing stays the same)
- Adding new third-party API integrations

## Tasks
1. **Global theme overhaul** — Replace the current light/mixed color scheme with a dark neon cyberpunk theme. Update CSS variables, gradients, fonts, and add glow/pulse utility classes. Create animated background effects.

2. **Unified layout and navigation** — Restructure from separate pages into a single-page dashboard with a sidebar for section navigation (Performance, Mix Studio, Soundboard, Recordings). Add a collapsible sidebar with neon-styled icons and labels.

3. **Synth pad grid redesign** — Transform the PianoGrid into a neon launch-pad style matrix with glowing press animations, ripple effects, and color-coded sound categories. Add velocity sensitivity visual feedback.

4. **Soundboard overlay system** — Build a floating/dockable soundboard panel with a grid of trigger pads for short sound bytes. Support user upload of audio clips, categorization, and quick-fire playback over the current mix. Include built-in default sounds (drops, effects, vocal chops).

5. **DJ mixer visual upgrade** — Restyle the dual-deck mixer, crossfader, transport controls, EQ panel, and effects rack to match the neon theme. Add animated VU meters and enhanced waveform visualizer styling.

6. **Beginner/Advanced mode toggle** — Add a mode switcher that shows a simplified "Party Mode" view (big pads, presets, one-tap recording) vs full "Studio Mode" (all controls exposed). Persist preference.

7. **Recording workflow improvements** — Enhance the record/save flow with visual countdown, waveform preview of captured audio, naming/tagging before save, and a recordings library browser.

8. **Beat-reactive visual enhancements** — Upgrade spectrum analyzer and visualizer components with neon color palettes, particle effects, and beat-synced background animations throughout the UI.

## Relevant files
- `client/src/index.css`
- `client/src/App.tsx`
- `client/src/pages/home.tsx`
- `client/src/pages/dj.tsx`
- `client/src/pages/share.tsx`
- `client/src/components/PianoGrid.tsx`
- `client/src/components/PianoKey.tsx`
- `client/src/components/WaveformVisualizer.tsx`
- `client/src/components/SunoGenerator.tsx`
- `client/src/components/BaseTrackUploader.tsx`
- `client/src/components/dj/TransportControls.tsx`
- `client/src/components/dj/EffectsRack.tsx`
- `client/src/components/dj/EffectKnob.tsx`
- `client/src/components/dj/EqualizerPanel.tsx`
- `client/src/components/dj/BPMDisplay.tsx`
- `client/src/components/dj/SpectrumAnalyzer.tsx`
- `client/src/components/dj/BeatReactiveVisuals.tsx`
- `client/src/components/dj/FullScreenVisualizer.tsx`
- `client/src/components/dj/SessionRecorder.tsx`
- `client/src/components/dj/CuePointControl.tsx`
- `client/src/components/dj/LoopControl.tsx`
- `client/src/components/modals/ShareModal.tsx`
- `client/src/components/modals/SettingsModal.tsx`
- `client/src/components/modals/CustomSoundsModal.tsx`
- `client/src/lib/audio.ts`
- `client/src/lib/djAudio.ts`
- `client/src/lib/audioEffects.ts`
- `client/src/lib/visualEffects.ts`
- `server/routes.ts`
- `server/storage.ts`
- `shared/schema.ts`
