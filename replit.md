# Synth Dance Party DJ Board - Interactive Music Production Studio

## Overview

A next-gen synth dance party DJ board and music production app with a neon cyberpunk aesthetic. Features a unified single-page dashboard with sidebar navigation, neon launchpad-style synth grid, soundboard overlay with user-uploaded and built-in sounds, Party Mode (beginner) / Studio Mode (advanced) toggle, enhanced recording workflow with countdown, waveform preview, and naming/tagging, and beat-reactive visuals. Built with React frontend and Express backend using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **Routing**: Wouter for lightweight client-side routing (single dashboard page)
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with neon cyberpunk CSS variables (`--neon-cyan`, `--neon-magenta`, `--neon-purple`)
- **Theme Classes**: `glass-panel`, `neon-border`, `neon-border-magenta`, `neon-text-cyan`, `neon-text-magenta`, `neon-text-purple`, `bg-dark-gradient`, `bg-grid-pattern`
- **State Management**: TanStack Query for server state, local React state for UI, localStorage for recordings and preferences
- **Audio**: Web Audio API with Howler.js for sound playback and recording
- **Animations**: Framer Motion for smooth transitions, CSS animations for neon effects

### Layout & Navigation
- **Single-page dashboard** (`pages/dashboard.tsx`) with collapsible sidebar
- **Five views**: Performance, Mix Studio, Soundboard, Recordings, Visuals
- **Party/Studio mode toggle** persisted in localStorage
- **DeckPanel** extracted as separate component with its own hooks

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with structured error handling
- **File Handling**: Base64 encoding for audio data storage
- **Development**: Hot reload with Vite middleware integration

### Database Schema
- **Users**: Basic user management with username/password
- **Sound Libraries**: User-created collections of custom sounds
- **Sound Samples**: Audio files with metadata (name, description, MIME type)
- **Note Mappings**: Links between piano notes and sound samples
- **Recordings**: User compositions with JSON data structure
- **Shared Content**: Public sharing mechanism for recordings

### Audio System
- **Sound Generation**: Web Audio API oscillators for built-in instruments (piano, synth, chiptune, funk)
- **Custom Sounds**: File upload with audio processing and validation
- **Soundboard**: Floating overlay with trigger pads, user-uploaded and built-in sounds (stored in localStorage)
- **Recording**: Real-time note capture with countdown timer, waveform visualization, naming/tagging workflow
- **Playback**: Accurate reproduction of recorded sequences with library management
- **Beat Patterns**: Background rhythm tracks with multiple styles
- **DJ Mixer**: Dual-deck mixing with crossfader, EQ, effects rack, BPM sync

### DJ Components (client/src/components/dj/)
- **BPMDisplay**: Tempo display with neon styling
- **TransportControls**: Play/pause/cue controls
- **CuePointControl**: Hot cue management
- **LoopControl**: Auto/manual loop controls
- **EqualizerPanel**: 3-band EQ with frequency response canvas
- **EffectsRack**: Multi-slot effects chain with EffectKnob rotary controls
- **SpectrumAnalyzer**: Real-time FFT spectrum display
- **BeatReactiveVisuals**: Beat-responsive canvas animations
- **VisualizationControls**: Theme/effects/preset management
- **SessionRecorder**: Professional session recording with level meters
- **FullScreenVisualizer**: Immersive fullscreen visual mode

### Neon Theme Pattern
All components follow consistent neon-cyberpunk styling:
- Card wrappers: `glass-panel neon-border` (replaces `bg-gray-900 border-gray-700`)
- Muted text: `text-white/40` (replaces `text-gray-400`)
- Subtle text: `text-white/30` (replaces `text-gray-500`)
- Dark backgrounds: `bg-black/30` (replaces `bg-gray-800`)
- Subtle backgrounds: `bg-white/10` (replaces `bg-gray-700`)
- Borders: `border-white/10` (replaces `border-gray-600`)
- Accent colors: `text-cyan-400` (replaces `text-blue-400`)

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle Kit**: Database migrations and schema management

### Audio & Media
- **Howler.js**: Cross-browser audio library for sound playback
- **Web Audio API**: Native browser audio processing
- **MediaRecorder API**: Browser recording capabilities

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Animation library for smooth interactions
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for UI elements

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler

### Validation & Forms
- **Zod**: Runtime type validation
- **React Hook Form**: Form state management
- **Drizzle Zod**: Database schema validation

## Key Files
- `client/src/index.css` - Global neon theme variables and utility classes
- `client/src/pages/dashboard.tsx` - Main unified dashboard layout
- `client/src/components/DeckPanel.tsx` - DJ deck panel component
- `client/src/components/PianoGrid.tsx` / `PianoKey.tsx` - Synth pad grid
- `client/src/components/Soundboard.tsx` - Soundboard overlay
- `client/src/components/dj/*` - All DJ mixer components
