// ---------------------------------------------------------------------------
// Real-time Collaboration Module
// ---------------------------------------------------------------------------
// Uses WebRTC data channels for peer-to-peer communication.
//
// SIGNALING: The current implementation uses localStorage as a mock signaling
// mechanism for same-browser tab-to-tab testing. To add a real signaling
// server:
//
//   1. Replace `localStorageSignaling` with WebSocket calls to your server
//   2. The signaling server should relay SDP offers/answers and ICE candidates
//      between peers
//   3. Each session needs a unique room/channel on the signaling server
//   4. See the TODO comments marked [SIGNALING] for integration points
//
// For production, consider services like:
//   - Firebase Realtime Database (for signaling)
//   - PeerJS (abstraction over WebRTC)
//   - A custom WebSocket server
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollabSession {
  id: string;
  hostId: string;
  participants: CollabParticipant[];
  created: number;
}

export interface CollabParticipant {
  id: string;
  name: string;
  color: string;
  role: "host" | "guest";
}

export interface CollabMessage {
  type: "sync" | "control" | "chat" | "cursor" | "state";
  senderId: string;
  payload: any;
  timestamp: number;
}

export interface DeckState {
  deck: "A" | "B";
  trackName: string;
  position: number;       // 0-1 playback position
  isPlaying: boolean;
  bpm: number;
  volume: number;
  eq: { low: number; mid: number; high: number };
}

export interface PadTriggerPayload {
  padIndex: number;
  bank: number;
  velocity: number;
}

export interface TransportPayload {
  isPlaying: boolean;
  beat: number;
  bpm: number;
}

export interface CursorPayload {
  x: number;
  y: number;
  element?: string;
}

export interface SyncStatePayload {
  decks: { A: DeckState; B: DeckState };
  activeBank: number;
  bpm: number;
  participants: CollabParticipant[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTICIPANT_COLORS = [
  "#00f0ff", // cyan
  "#ff00e5", // fuchsia
  "#a855f7", // violet
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#84cc16", // lime
];

const STORAGE_PREFIX = "dj-collab-";
const SIGNALING_CHANNEL = "dj-collab-signaling";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateColor(usedColors: string[]): string {
  for (const color of PARTICIPANT_COLORS) {
    if (!usedColors.includes(color)) return color;
  }
  return PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)];
}

function createMessage(type: CollabMessage["type"], senderId: string, payload: any): CollabMessage {
  return {
    type,
    senderId,
    payload,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Mock localStorage-based signaling
// ---------------------------------------------------------------------------
// [SIGNALING] Replace this section with WebSocket-based signaling for
// production use. The signaling server handles:
//   - Broadcasting session join/leave events
//   - Relaying SDP offers/answers between peers
//   - Relaying ICE candidates between peers

interface SignalEnvelope {
  type: "join" | "leave" | "offer" | "answer" | "ice-candidate" | "session-list" | "ping";
  sessionId: string;
  senderId: string;
  targetId?: string;
  data?: any;
  timestamp: number;
}

type SignalHandler = (envelope: SignalEnvelope) => void;

class LocalStorageSignaling {
  private handlers: Set<SignalHandler> = new Set();
  private listener: ((e: StorageEvent) => void) | null = null;
  private myId: string;

  constructor(myId: string) {
    this.myId = myId;
  }

  start(): void {
    this.listener = (e: StorageEvent) => {
      if (e.key !== SIGNALING_CHANNEL || !e.newValue) return;
      try {
        const envelope: SignalEnvelope = JSON.parse(e.newValue);
        // Don't process our own messages
        if (envelope.senderId === this.myId) return;

        // For targeted messages, only process if we are the target
        if (envelope.targetId && envelope.targetId !== this.myId) return;

        for (const handler of this.handlers) {
          handler(envelope);
        }
      } catch {
        // invalid JSON, ignore
      }
    };
    window.addEventListener("storage", this.listener);
  }

  stop(): void {
    if (this.listener) {
      window.removeEventListener("storage", this.listener);
      this.listener = null;
    }
    this.handlers.clear();
  }

  onSignal(handler: SignalHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(envelope: Omit<SignalEnvelope, "timestamp" | "senderId">): void {
    const full: SignalEnvelope = {
      ...envelope,
      senderId: this.myId,
      timestamp: Date.now(),
    };
    // Write to localStorage to trigger storage event in other tabs
    localStorage.setItem(SIGNALING_CHANNEL, JSON.stringify(full));
    // Also process locally for same-tab communication
    // (useful if host and guest are in the same tab for testing)
  }

  broadcastSessionList(sessions: CollabSession[]): void {
    this.send({
      type: "session-list",
      sessionId: "",
      data: sessions,
    });
  }

  requestSessionList(): void {
    this.send({
      type: "ping",
      sessionId: "",
    });
  }
}

// ---------------------------------------------------------------------------
// CollaborationManager
// ---------------------------------------------------------------------------

export interface CollaborationEvents {
  onParticipantJoin?: (participant: CollabParticipant) => void;
  onParticipantLeave?: (participantId: string) => void;
  onMessage?: (message: CollabMessage) => void;
  onDeckState?: (deck: "A" | "B", state: DeckState) => void;
  onPadTrigger?: (padIndex: number, bank: number, velocity: number) => void;
  onTransport?: (isPlaying: boolean, beat: number, bpm: number) => void;
  onCursor?: (participantId: string, position: CursorPayload) => void;
  onSyncState?: (state: SyncStatePayload) => void;
  onSessionEnd?: () => void;
  onError?: (error: Error) => void;
}

export class CollaborationManager {
  private localId: string;
  private localName: string;
  private session: CollabSession | null = null;
  private signaling: LocalStorageSignaling | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private messageHandlers: Set<(msg: CollabMessage) => void> = new Set();
  private events: CollaborationEvents = {};
  private localColor: string = PARTICIPANT_COLORS[0];

  // Pending ICE candidates (gathered before remote description is set)
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  // Available sessions (for discovery)
  private knownSessions: Map<string, CollabSession> = new Map();

  constructor() {
    this.localId = generateId();
    this.localName = "User";
    this.localColor = generateColor([]);
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  setEvents(events: CollaborationEvents): void {
    this.events = events;
  }

  setUsername(name: string): void {
    this.localName = name;
    // Broadcast updated participant info
    if (this.session) {
      this.broadcastToPeers(
        createMessage("state", this.localId, {
          type: "participant-update",
          participant: this.getLocalParticipant(),
        })
      );
    }
  }

  getLocalId(): string {
    return this.localId;
  }

  // -----------------------------------------------------------------------
  // Session Management
  // -----------------------------------------------------------------------

  async createSession(name?: string): Promise<CollabSession> {
    if (this.session) {
      throw new Error("Already in a session. Leave first.");
    }

    this.signaling = new LocalStorageSignaling(this.localId);
    this.signaling.start();

    // Listen for join requests
    this.signaling.onSignal((envelope) => {
      this.handleSignal(envelope);
    });

    const session: CollabSession = {
      id: generateId(),
      hostId: this.localId,
      participants: [this.getLocalParticipant()],
      created: Date.now(),
    };

    this.session = session;
    this.localColor = generateColor([]);

    // Store session in localStorage for discovery
    this.storeSession(session);

    // Broadcast available sessions
    this.signaling.broadcastSessionList([session]);

    // Wait for join requests from guests (handled in handleSignal)

    return session;
  }

  async joinSession(sessionId: string): Promise<CollabSession> {
    if (this.session) {
      throw new Error("Already in a session. Leave first.");
    }

    this.signaling = new LocalStorageSignaling(this.localId);
    this.signaling.start();

    // Listen for signaling messages
    this.signaling.onSignal((envelope) => {
      this.handleSignal(envelope);
    });

    // Find the session in known sessions
    const storedSession = this.knownSessions.get(sessionId);
    if (!storedSession) {
      // Try to load from localStorage
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
      if (stored) {
        const parsed: CollabSession = JSON.parse(stored);
        this.knownSessions.set(sessionId, parsed);
      } else {
        throw new Error(`Session ${sessionId} not found`);
      }
    }

    const targetSession = this.knownSessions.get(sessionId)!;

    const participant = this.getLocalParticipant();
    participant.role = "guest";

    // Update local session state
    this.session = {
      ...targetSession,
      participants: [...targetSession.participants, participant],
    };

    this.localColor = generateColor(
      this.session.participants.map((p) => p.color)
    );

    // Send join request to host
    this.signaling.send({
      type: "join",
      sessionId: targetSession.id,
      data: {
        participant: { ...participant, color: this.localColor },
      },
    });

    return this.session;
  }

  leaveSession(): void {
    if (!this.session) return;

    // Notify peers
    this.signaling?.send({
      type: "leave",
      sessionId: this.session.id,
    });

    // Close all peer connections
    for (const [peerId, pc] of this.peers) {
      pc.close();
    }
    this.peers.clear();
    this.dataChannels.clear();
    this.pendingIceCandidates.clear();

    // Remove from storage
    this.removeSession(this.session);

    this.signaling?.stop();
    this.signaling = null;
    this.session = null;

    this.events.onSessionEnd?.();
  }

  getSession(): CollabSession | null {
    return this.session;
  }

  // -----------------------------------------------------------------------
  // WebRTC Connection
  // -----------------------------------------------------------------------

  async connectToPeer(peerId: string): Promise<void> {
    if (this.peers.has(peerId)) {
      return; // already connected
    }

    const pc = this.createPeerConnection(peerId);
    this.peers.set(peerId, pc);

    // Create data channel (host initiates)
    const channel = pc.createDataChannel(`dj-data-${peerId}`, {
      ordered: true,
    });
    this.setupDataChannel(channel, peerId);

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.signaling?.send({
      type: "offer",
      sessionId: this.session!.id,
      targetId: peerId,
      data: offer,
    });
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    // STUN servers for NAT traversal
    // In production, add TURN servers for reliability
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling?.send({
          type: "ice-candidate",
          sessionId: this.session!.id,
          targetId: peerId,
          data: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.warn(`Peer ${peerId} connection ${pc.connectionState}`);
        this.removePeer(peerId);
      }
    };

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, peerId);
    };

    return pc;
  }

  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.onopen = () => {
      this.dataChannels.set(peerId, channel);
      console.log(`Data channel open with ${peerId}`);

      // Send current state to newly connected peer
      if (this.isHost()) {
        this.sendToPeer(
          peerId,
          createMessage("sync", this.localId, {
            type: "full-sync",
            session: this.session,
          })
        );
      }
    };

    channel.onclose = () => {
      this.dataChannels.delete(peerId);
      console.log(`Data channel closed with ${peerId}`);
    };

    channel.onmessage = (event) => {
      try {
        const message: CollabMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    channel.onerror = (event) => {
      console.error(`Data channel error with ${peerId}:`, event);
      this.events.onError?.(new Error(`Data channel error with peer ${peerId}`));
    };
  }

  private removePeer(peerId: string): void {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.dataChannels.delete(peerId);
    this.pendingIceCandidates.delete(peerId);

    // Update participants
    if (this.session) {
      this.session.participants = this.session.participants.filter(
        (p) => p.id !== peerId
      );
      this.events.onParticipantLeave?.(peerId);
    }
  }

  // -----------------------------------------------------------------------
  // Message Handling
  // -----------------------------------------------------------------------

  sendMessage(message: CollabMessage): void {
    this.broadcastToPeers(message);
    // Also call local handlers
    this.handleMessage(message);
  }

  onMessage(handler: (msg: CollabMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private handleMessage(message: CollabMessage): void {
    // Don't process our own messages (they're already handled locally)
    if (message.senderId === this.localId) return;

    // Notify all handlers
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (err) {
        console.error("Message handler error:", err);
      }
    }

    // Route to specific event handlers
    switch (message.type) {
      case "sync":
        if (message.payload.type === "full-sync") {
          const syncState = message.payload as SyncStatePayload;
          this.events.onSyncState?.(syncState);
        }
        break;

      case "control":
        this.handleControlMessage(message);
        break;

      case "cursor":
        this.events.onCursor?.(message.senderId, message.payload as CursorPayload);
        break;

      case "state":
        if (message.payload.type === "participant-update" && this.session) {
          const updated = message.payload.participant as CollabParticipant;
          const idx = this.session.participants.findIndex(
            (p) => p.id === updated.id
          );
          if (idx >= 0) {
            this.session.participants[idx] = updated;
          } else {
            this.session.participants.push(updated);
            this.events.onParticipantJoin?.(updated);
          }
        }
        break;
    }
  }

  private handleControlMessage(message: CollabMessage): void {
    const { payload } = message;

    switch (payload.action) {
      case "deck-state":
        this.events.onDeckState?.(payload.deck, payload.state);
        break;

      case "pad-trigger":
        this.events.onPadTrigger?.(
          payload.padIndex,
          payload.bank,
          payload.velocity
        );
        break;

      case "transport":
        this.events.onTransport?.(
          payload.isPlaying,
          payload.beat,
          payload.bpm
        );
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Signaling Handlers
  // -----------------------------------------------------------------------

  private handleSignal(envelope: SignalEnvelope): void {
    if (!this.session) return;

    switch (envelope.type) {
      case "join":
        this.handleJoinRequest(envelope);
        break;

      case "leave":
        this.removePeer(envelope.senderId);
        break;

      case "offer":
        this.handleOffer(envelope);
        break;

      case "answer":
        this.handleAnswer(envelope);
        break;

      case "ice-candidate":
        this.handleIceCandidate(envelope);
        break;

      case "session-list":
        this.handleSessionList(envelope);
        break;

      case "ping":
        // If we're a host, respond with session info
        if (this.isHost()) {
          this.storeSession(this.session);
        }
        break;
    }
  }

  private handleJoinRequest(envelope: SignalEnvelope): void {
    if (!this.isHost()) return;

    const participant = envelope.data.participant as CollabParticipant;

    // Add to session
    if (!this.session!.participants.find((p) => p.id === participant.id)) {
      this.session!.participants.push(participant);
      this.storeSession(this.session!);
      this.events.onParticipantJoin?.(participant);
    }

    // Connect to the new peer
    this.connectToPeer(participant.id).catch((err) => {
      console.error("Failed to connect to peer:", err);
      this.events.onError?.(err);
    });
  }

  private async handleOffer(envelope: SignalEnvelope): Promise<void> {
    if (envelope.targetId !== this.localId) return;

    let pc = this.peers.get(envelope.senderId);
    if (!pc) {
      pc = this.createPeerConnection(envelope.senderId);
      this.peers.set(envelope.senderId, pc);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(envelope.data));

    // Process any pending ICE candidates
    const pending = this.pendingIceCandidates.get(envelope.senderId);
    if (pending) {
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingIceCandidates.delete(envelope.senderId);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.signaling?.send({
      type: "answer",
      sessionId: this.session!.id,
      targetId: envelope.senderId,
      data: answer,
    });
  }

  private async handleAnswer(envelope: SignalEnvelope): Promise<void> {
    if (envelope.targetId !== this.localId) return;

    const pc = this.peers.get(envelope.senderId);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(envelope.data));

    // Process any pending ICE candidates
    const pending = this.pendingIceCandidates.get(envelope.senderId);
    if (pending) {
      for (const candidate of pending) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingIceCandidates.delete(envelope.senderId);
    }
  }

  private async handleIceCandidate(envelope: SignalEnvelope): Promise<void> {
    if (envelope.targetId !== this.localId) return;

    const pc = this.peers.get(envelope.senderId);
    const candidate = new RTCIceCandidate(envelope.data);

    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(candidate);
    } else {
      // Queue for later
      const pending = this.pendingIceCandidates.get(envelope.senderId) || [];
      pending.push(envelope.data);
      this.pendingIceCandidates.set(envelope.senderId, pending);
    }
  }

  private handleSessionList(envelope: SignalEnvelope): void {
    const sessions = envelope.data as CollabSession[];
    for (const session of sessions) {
      this.knownSessions.set(session.id, session);
    }
  }

  // -----------------------------------------------------------------------
  // State Synchronization
  // -----------------------------------------------------------------------

  broadcastDeckState(deck: "A" | "B", state: DeckState): void {
    const message = createMessage("control", this.localId, {
      action: "deck-state",
      deck,
      state,
    });
    this.broadcastToPeers(message);
  }

  broadcastPadTrigger(padIndex: number, bank: number, velocity: number): void {
    const message = createMessage("control", this.localId, {
      action: "pad-trigger",
      padIndex,
      bank,
      velocity,
    });
    this.broadcastToPeers(message);
  }

  broadcastTransport(isPlaying: boolean, beat: number, bpm: number = 120): void {
    const message = createMessage("control", this.localId, {
      action: "transport",
      isPlaying,
      beat,
      bpm,
    });
    this.broadcastToPeers(message);
  }

  requestSync(): void {
    if (!this.session) return;

    const message = createMessage("sync", this.localId, {
      type: "sync-request",
      requesterId: this.localId,
    });
    this.broadcastToPeers(message);
  }

  // -----------------------------------------------------------------------
  // Presence
  // -----------------------------------------------------------------------

  getParticipants(): CollabParticipant[] {
    return this.session?.participants ?? [];
  }

  setCursor(position: CursorPayload): void {
    const message = createMessage("cursor", this.localId, position);
    this.broadcastToPeers(message);
  }

  isHost(): boolean {
    return this.session?.hostId === this.localId;
  }

  // -----------------------------------------------------------------------
  // Internal Helpers
  // -----------------------------------------------------------------------

  private getLocalParticipant(): CollabParticipant {
    return {
      id: this.localId,
      name: this.localName,
      color: this.localColor,
      role: this.session?.hostId === this.localId ? "host" : "guest",
    };
  }

  private broadcastToPeers(message: CollabMessage): void {
    const data = JSON.stringify(message);

    for (const [peerId, channel] of this.dataChannels) {
      if (channel.readyState === "open") {
        try {
          channel.send(data);
        } catch (err) {
          console.error(`Failed to send to ${peerId}:`, err);
        }
      }
    }
  }

  private sendToPeer(peerId: string, message: CollabMessage): void {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === "open") {
      try {
        channel.send(JSON.stringify(message));
      } catch (err) {
        console.error(`Failed to send to ${peerId}:`, err);
      }
    }
  }

  private storeSession(session: CollabSession): void {
    localStorage.setItem(
      `${STORAGE_PREFIX}${session.id}`,
      JSON.stringify(session)
    );
  }

  private removeSession(session: CollabSession): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${session.id}`);
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  destroy(): void {
    this.leaveSession();
    this.messageHandlers.clear();
    this.events = {};
    this.knownSessions.clear();
  }
}

// ---------------------------------------------------------------------------
// Convenience: list available sessions
// ---------------------------------------------------------------------------

export function getAvailableSessions(): CollabSession[] {
  const sessions: CollabSession[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const session: CollabSession = JSON.parse(localStorage.getItem(key)!);
        sessions.push(session);
      } catch {
        // invalid data, skip
      }
    }
  }
  return sessions;
}
