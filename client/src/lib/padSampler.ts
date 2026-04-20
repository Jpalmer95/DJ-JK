import { initAudioContext } from "./audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Subdivision = 'none' | '1/4' | '1/8' | '1/16' | '1/32';

export type TriggerMode = 'oneshot' | 'loop' | 'gate';

export type PadCategory =
  | 'kick'
  | 'snare'
  | 'hihat'
  | 'clap'
  | 'perc'
  | 'fx'
  | 'vocal'
  | 'bass'
  | 'chord'
  | 'loop'
  | 'oneshot'
  | 'other';

export interface PadSample {
  id: string;
  name: string;
  audioBuffer: AudioBuffer | null;
  color: string;
  volume: number;       // 0 – 1
  pitch: number;        // playbackRate 0.5 – 2.0
  attack: number;       // ms
  decay: number;        // ms
  category: PadCategory;
  triggerMode: TriggerMode;
}

export interface PadBank {
  id: number;
  pads: (PadSample | null)[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAD_COUNT = 16;
const BANK_COUNT = 8;

const DEFAULT_PAD_COLOR = '#6366f1'; // indigo-500

const SUBDIVISION_BEATS: Record<Subdivision, number> = {
  'none': 1,
  '1/4': 1,
  '1/8': 0.5,
  '1/16': 0.25,
  '1/32': 0.125,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `pad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function createEmptyPad(slot: number): PadSample {
  return {
    id: generateId(),
    name: `Pad ${slot + 1}`,
    audioBuffer: null,
    color: DEFAULT_PAD_COLOR,
    volume: 0.8,
    pitch: 1.0,
    attack: 5,
    decay: 50,
    category: 'other',
    triggerMode: 'oneshot',
  };
}

function createEmptyBank(id: number): PadBank {
  const pads: (PadSample | null)[] = [];
  for (let i = 0; i < PAD_COUNT; i++) {
    pads.push(createEmptyPad(i));
  }
  return { id, pads };
}

// ---------------------------------------------------------------------------
// Active voice – one per playing source node
// ---------------------------------------------------------------------------

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  slot: number;
  bank: number;
  isLooping: boolean;
}

// ---------------------------------------------------------------------------
// PadSampler
// ---------------------------------------------------------------------------

export class PadSampler {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private banks: PadBank[];
  private activeBank: number;
  private activeVoices: Map<string, ActiveVoice>;
  private bpm: number;
  private subdivision: Subdivision;
  private destroyed: boolean;

  // Off-line recording helpers
  private offlineBuffer: Float32Array[] | null = null;

  constructor() {
    this.ctx = initAudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);

    this.banks = [];
    for (let i = 0; i < BANK_COUNT; i++) {
      this.banks.push(createEmptyBank(i));
    }

    this.activeBank = 0;
    this.activeVoices = new Map();
    this.bpm = 120;
    this.subdivision = 'none';
    this.destroyed = false;
  }

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  async loadSample(file: File, slot: number, bank: number): Promise<void> {
    this.ensureAlive();
    this.validateSlotBank(slot, bank);

    const arrayBuf = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuf);

    const pad = this.banks[bank].pads[slot] ?? createEmptyPad(slot);
    pad.audioBuffer = audioBuffer;
    pad.name = file.name.replace(/\.[^/.]+$/, '');
    this.banks[bank].pads[slot] = pad;
  }

  loadSampleFromBuffer(buffer: AudioBuffer, slot: number, bank: number): void {
    this.ensureAlive();
    this.validateSlotBank(slot, bank);

    const pad = this.banks[bank].pads[slot] ?? createEmptyPad(slot);
    pad.audioBuffer = buffer;
    this.banks[bank].pads[slot] = pad;
  }

  // -----------------------------------------------------------------------
  // Triggering
  // -----------------------------------------------------------------------

  triggerPad(slot: number, bank: number, velocity: number = 1.0): void {
    this.ensureAlive();
    this.validateSlotBank(slot, bank);

    const pad = this.banks[bank].pads[slot];
    if (!pad || !pad.audioBuffer) return;

    velocity = clamp(velocity, 0, 1);

    // If already looping on this slot/bank, stop first
    const voiceKey = `${bank}_${slot}`;
    const existing = this.activeVoices.get(voiceKey);
    if (existing && existing.isLooping) {
      this.stopPad(slot, bank);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = pad.audioBuffer;
    source.playbackRate.value = clamp(pad.pitch, 0.5, 2.0);
    source.loop = pad.triggerMode === 'loop';

    const gainNode = this.ctx.createGain();
    const now = this.ctx.currentTime;
    const attackSec = Math.max(pad.attack, 1) / 1000;
    const decaySec = Math.max(pad.decay, 1) / 1000;
    const peakVol = pad.volume * velocity;

    // Envelope: attack ramp up then decay to sustain
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(peakVol, 0.0001), now + attackSec);

    if (pad.triggerMode === 'oneshot') {
      // Decay after peak
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(peakVol * 0.3, 0.0001),
        now + attackSec + decaySec,
      );
    }

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Track voice
    const voice: ActiveVoice = {
      source,
      gainNode,
      slot,
      bank,
      isLooping: pad.triggerMode === 'loop',
    };

    this.activeVoices.set(voiceKey, voice);

    // Auto-cleanup for oneshot / gate (gate = release handled externally via stopPad)
    source.onended = () => {
      // Only remove if this exact source is still the active one
      const current = this.activeVoices.get(voiceKey);
      if (current && current.source === source) {
        this.activeVoices.delete(voiceKey);
      }
      source.disconnect();
      gainNode.disconnect();
    };

    source.start(now);

    // For oneshot, schedule natural stop after buffer duration / pitch
    if (pad.triggerMode === 'oneshot') {
      const duration = pad.audioBuffer.duration / clamp(pad.pitch, 0.5, 2.0);
      source.stop(now + duration + 0.05); // tiny tail for envelope
    }
  }

  triggerPadQuantized(
    slot: number,
    bank: number,
    bpm?: number,
    subdivision?: Subdivision,
    velocity: number = 1.0,
  ): void {
    this.ensureAlive();
    this.validateSlotBank(slot, bank);

    const effectiveBpm = bpm ?? this.bpm;
    const effectiveSub = subdivision ?? this.subdivision;

    if (effectiveSub === 'none') {
      this.triggerPad(slot, bank, velocity);
      return;
    }

    const beatsPerSec = effectiveBpm / 60;
    const subdivisionBeats = SUBDIVISION_BEATS[effectiveSub];
    const intervalSec = subdivisionBeats / beatsPerSec;

    const now = this.ctx.currentTime;
    // Find next grid boundary
    const nextBoundary = Math.ceil(now / intervalSec) * intervalSec;
    const delay = (nextBoundary - now) * 1000; // ms

    // Use setTimeout for scheduling (sub-frame accuracy is fine for > 5ms)
    if (delay < 2) {
      this.triggerPad(slot, bank, velocity);
    } else {
      setTimeout(() => this.triggerPad(slot, bank, velocity), delay);
    }
  }

  // -----------------------------------------------------------------------
  // Stopping
  // -----------------------------------------------------------------------

  stopPad(slot: number, bank: number): void {
    this.ensureAlive();
    this.validateSlotBank(slot, bank);

    const voiceKey = `${bank}_${slot}`;
    const voice = this.activeVoices.get(voiceKey);
    if (!voice) return;

    const now = this.ctx.currentTime;
    // Quick fade-out to avoid clicks
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    try {
      voice.source.stop(now + 0.03);
    } catch {
      // Already stopped
    }

    this.activeVoices.delete(voiceKey);
  }

  stopAllPads(): void {
    const now = this.ctx.currentTime;
    for (const [_key, voice] of this.activeVoices) {
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
      voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
      try {
        voice.source.stop(now + 0.02);
      } catch {
        // ignore
      }
    }
    this.activeVoices.clear();
  }

  // -----------------------------------------------------------------------
  // Per-pad parameter setters
  // -----------------------------------------------------------------------

  setPadVolume(slot: number, bank: number, volume: number): void {
    this.validateSlotBank(slot, bank);
    const pad = this.banks[bank].pads[slot];
    if (pad) pad.volume = clamp(volume, 0, 1);
  }

  setPadPitch(slot: number, bank: number, pitchRate: number): void {
    this.validateSlotBank(slot, bank);
    const pad = this.banks[bank].pads[slot];
    if (pad) pad.pitch = clamp(pitchRate, 0.5, 2.0);
  }

  setPadAttack(slot: number, bank: number, ms: number): void {
    this.validateSlotBank(slot, bank);
    const pad = this.banks[bank].pads[slot];
    if (pad) pad.attack = Math.max(0, ms);
  }

  setPadDecay(slot: number, bank: number, ms: number): void {
    this.validateSlotBank(slot, bank);
    const pad = this.banks[bank].pads[slot];
    if (pad) pad.decay = Math.max(0, ms);
  }

  // -----------------------------------------------------------------------
  // Master / routing
  // -----------------------------------------------------------------------

  setMasterVolume(volume: number): void {
    this.masterGain.gain.setValueAtTime(clamp(volume, 0, 1), this.ctx.currentTime);
  }

  connectTo(destination: AudioNode): void {
    this.masterGain.disconnect();
    this.masterGain.connect(destination);
  }

  // -----------------------------------------------------------------------
  // Global settings
  // -----------------------------------------------------------------------

  setBpm(bpm: number): void {
    this.bpm = Math.max(20, bpm);
  }

  setSubdivision(sub: Subdivision): void {
    this.subdivision = sub;
  }

  // -----------------------------------------------------------------------
  // Bank / pad access
  // -----------------------------------------------------------------------

  setActiveBank(bank: number): void {
    if (bank < 0 || bank >= BANK_COUNT) {
      throw new RangeError(`Bank must be 0–${BANK_COUNT - 1}`);
    }
    this.activeBank = bank;
  }

  getActiveBank(): number {
    return this.activeBank;
  }

  getPad(slot: number, bank: number): PadSample | null {
    this.validateSlotBank(slot, bank);
    return this.banks[bank].pads[slot];
  }

  getBank(bank: number): PadBank {
    if (bank < 0 || bank >= BANK_COUNT) {
      throw new RangeError(`Bank must be 0–${BANK_COUNT - 1}`);
    }
    return this.banks[bank];
  }

  getAllBanks(): PadBank[] {
    return this.banks;
  }

  // -----------------------------------------------------------------------
  // Recording output (renders to an AudioBuffer)
  // -----------------------------------------------------------------------

  async recordOutput(durationSec: number, bpm?: number, bars?: number): Promise<AudioBuffer> {
    this.ensureAlive();

    // If bars provided, compute duration from bpm
    let dur = durationSec;
    if (bars && bpm) {
      const beatsPerBar = 4;
      const totalBeats = bars * beatsPerBar;
      dur = (totalBeats / bpm) * 60;
    }
    dur = Math.max(0.1, dur);

    const sampleRate = this.ctx.sampleRate;
    const length = Math.ceil(dur * sampleRate);
    const numChannels = 2;

    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);

    // Clone master gain chain into offline context
    const offMaster = offlineCtx.createGain();
    offMaster.gain.value = this.masterGain.gain.value;
    offMaster.connect(offlineCtx.destination);

    // Schedule every currently loaded pad as a oneshot into the offline context
    // (This is a best-effort snapshot – plays all loaded pads once)
    for (const bank of this.banks) {
      for (let s = 0; s < PAD_COUNT; s++) {
        const pad = bank.pads[s];
        if (!pad || !pad.audioBuffer) continue;

        const src = offlineCtx.createBufferSource();
        src.buffer = pad.audioBuffer;
        src.playbackRate.value = pad.pitch;

        const gn = offlineCtx.createGain();
        const attackSec = Math.max(pad.attack, 1) / 1000;
        gn.gain.setValueAtTime(0.0001, 0);
        gn.gain.exponentialRampToValueAtTime(Math.max(pad.volume, 0.0001), attackSec);

        src.connect(gn);
        gn.connect(offMaster);
        src.start(0);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer;
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  destroy(): void {
    if (this.destroyed) return;
    this.stopAllPads();
    this.masterGain.disconnect();
    this.banks = [];
    this.destroyed = true;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private validateSlotBank(slot: number, bank: number): void {
    if (slot < 0 || slot >= PAD_COUNT) {
      throw new RangeError(`Slot must be 0–${PAD_COUNT - 1}`);
    }
    if (bank < 0 || bank >= BANK_COUNT) {
      throw new RangeError(`Bank must be 0–${BANK_COUNT - 1}`);
    }
  }

  private ensureAlive(): void {
    if (this.destroyed) {
      throw new Error('PadSampler has been destroyed');
    }
  }
}
