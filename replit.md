# Piano Tiles - Interactive Music Studio

## Overview

This is a full-stack web application that provides an interactive piano soundboard experience. Users can tap tiles to create music, record their compositions, and share them with others. The app features multiple sound modes (piano, synth, chiptune, funk), customizable themes, background beats, and the ability to upload custom sounds. Built with React frontend and Express backend, it uses PostgreSQL for data persistence and includes comprehensive sharing functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state, local React state for UI
- **Audio**: Web Audio API with Howler.js for sound playback and recording
- **Animations**: Framer Motion for smooth transitions and interactions

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
- **Sound Generation**: Web Audio API oscillators for built-in instruments
- **Custom Sounds**: File upload with audio processing and validation
- **Recording**: Real-time note capture with timing data
- **Playback**: Accurate reproduction of recorded sequences
- **Beat Patterns**: Background rhythm tracks with multiple styles

### Authentication & Authorization
- **Simple Authentication**: Username/password with session management
- **Session Storage**: PostgreSQL-backed session store for persistence
- **Route Protection**: Middleware-based access control for protected endpoints

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
- **Next Themes**: Dark/light theme management

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler
- **Replit Integration**: Development environment plugins

### Validation & Forms
- **Zod**: Runtime type validation
- **React Hook Form**: Form state management
- **Drizzle Zod**: Database schema validation

The application follows a monorepo structure with shared TypeScript types between client and server, ensuring type safety across the full stack. The audio engine supports both synthesized sounds and user-uploaded custom samples, with a sophisticated recording system that captures timing and note data for accurate playback and sharing.