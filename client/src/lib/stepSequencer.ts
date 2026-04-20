import { initAudioContext } from "./audio";

export interface StepSequencerTrack {
  id: string;
  name: string;
  color: string;
  mute: boolean;
  solo: boolean;
  volume: number;
  steps: boolean[];
  sampleBuffer: AudioBuffer | null;
  pitch: number;
  patternLength: number;
}

interface TrackGainNode {
  gainNode: GainNode;
  gainNodeConnected: boolean;
}

export class StepSequencer {
  private audioContext: AudioContext;
  private outputNode: AudioNode | null = null;
  private masterGain: GainNode;

  private tracks: Map<string, StepSequencerTrack> = new Map();
  private trackGainNodes: Map<string, TrackGainNode> = new Map();
  private trackOrder: string[] = [];

  private bpm: number = 120;
  private swing: number = 0;
  private maxSteps: number = 32;
  private maxTracks: number = 8;

  private playing: boolean = false;
  private paused: boolean = false;
  private _currentStep: number = 0;
  private nextStepTime: number = 0;
  private schedulerTimerId: number | null = null;
  private stepCallbacks: ((step: number) => void)[] = [];

  private scheduleAheadTime: number = 0.1; // seconds to look ahead
  private lookahead: number = 25; // ms for scheduler interval

  constructor() {
    this.audioContext = initAudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.audioContext.destination);
  }

  // --- Track Management ---

  addTrack(name: string, color: string): StepSequencerTrack {
    if (this.tracks.size >= this.maxTracks) {
      throw new Error(`Maximum of ${this.maxTracks} tracks reached`);
    }

    const id = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const track: StepSequencerTrack = {
      id,
      name,
      color,
      mute: false,
      solo: false,
      volume: 0.8,
      steps: new Array(this.maxSteps).fill(false),
      sampleBuffer: null,
      pitch: 1.0,
      patternLength: 16,
    };

    this.tracks.set(id, track);
    this.trackOrder.push(id);

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = track.volume;
    gainNode.connect(this.masterGain);

    this.trackGainNodes.set(id, { gainNode, gainNodeConnected: true });

    return { ...track };
  }

  removeTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    const gainInfo = this.trackGainNodes.get(trackId);
    if (gainInfo) {
      gainInfo.gainNode.disconnect();
      this.trackGainNodes.delete(trackId);
    }

    this.tracks.delete(trackId);
    this.trackOrder = this.trackOrder.filter((id) => id !== trackId);
  }

  // --- Step Control ---

  toggleStep(trackId: string, step: number): void {
    const track = this.tracks.get(trackId);
    if (!track || step < 0 || step >= this.maxSteps) return;
    track.steps[step] = !track.steps[step];
  }

  setStep(trackId: string, step: number, active: boolean): void {
    const track = this.tracks.get(trackId);
    if (!track || step < 0 || step >= this.maxSteps) return;
    track.steps[step] = active;
  }

  // --- Sample Loading ---

  loadSample(trackId: string, buffer: AudioBuffer): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.sampleBuffer = buffer;
  }

  // --- Playback ---

  play(): void {
    if (this.playing && !this.paused) return;

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    if (!this.paused) {
      this._currentStep = 0;
    }

    this.playing = true;
    this.paused = false;
    this.nextStepTime = this.audioContext.currentTime;
    this.scheduler();
    this.startSchedulerTimer();
  }

  stop(): void {
    this.playing = false;
    this.paused = false;
    this._currentStep = 0;
    this.stopSchedulerTimer();
  }

  pause(): void {
    if (!this.playing) return;
    this.paused = true;
    this.playing = false;
    this.stopSchedulerTimer();
  }

  private startSchedulerTimer(): void {
    this.stopSchedulerTimer();
    this.schedulerTimerId = window.setInterval(() => {
      this.scheduler();
    }, this.lookahead);
  }

  private stopSchedulerTimer(): void {
    if (this.schedulerTimerId !== null) {
      clearInterval(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
  }

  private scheduler(): void {
    while (this.nextStepTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this._currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  private scheduleStep(step: number, time: number): void {
    const hasSolo = this.hasSolo();

    for (const trackId of this.trackOrder) {
      const track = this.tracks.get(trackId);
      if (!track) continue;

      const patternLength = track.patternLength || 16;
      const effectiveStep = step % patternLength;

      if (!track.steps[effectiveStep]) continue;
      if (track.mute) continue;
      if (hasSolo && !track.solo) continue;
      if (!track.sampleBuffer) continue;

      const gainInfo = this.trackGainNodes.get(trackId);
      if (!gainInfo) continue;

      this.playSample(track, gainInfo, time);
    }

    // Notify UI callbacks
    for (const cb of this.stepCallbacks) {
      cb(step);
    }
  }

  private playSample(track: StepSequencerTrack, gainInfo: TrackGainNode, time: number): void {
    const buffer = track.sampleBuffer;
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.5, Math.min(2.0, track.pitch));

    // Per-hit gain for volume envelope
    const hitGain = this.audioContext.createGain();
    hitGain.gain.value = 1.0;

    source.connect(hitGain);
    hitGain.connect(gainInfo.gainNode);

    source.start(time);
  }

  private hasSolo(): boolean {
    for (const track of this.tracks.values()) {
      if (track.solo) return true;
    }
    return false;
  }

  private advanceStep(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    // 16th note = 1/4 of a beat
    let stepDuration = secondsPerBeat / 4;

    // Apply swing: alternate step durations

    if (this._currentStep % 2 === 0) {
      // Even step: add extra time for swing on the off-beat
      stepDuration += (this.swing * secondsPerBeat) / 8;
    } else {
      // Odd step: subtract swing time to compensate
      stepDuration -= (this.swing * secondsPerBeat) / 8;
    }

    this.nextStepTime += stepDuration;
    this._currentStep = (this._currentStep + 1) % this.maxSteps;
  }

  // --- BPM & Swing ---

  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm));
  }

  setSwing(amount: number): void {
    this.swing = Math.max(0, Math.min(1, amount));
  }

  // --- Pattern Length ---

  setPatternLength(trackId: string, length: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.patternLength = Math.max(1, Math.min(this.maxSteps, Math.round(length)));
  }

  // --- Track Controls ---

  muteTrack(trackId: string, mute: boolean): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.mute = mute;
  }

  soloTrack(trackId: string, solo: boolean): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.solo = solo;
  }

  setTrackVolume(trackId: string, volume: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    track.volume = Math.max(0, Math.min(1, volume));

    const gainInfo = this.trackGainNodes.get(trackId);
    if (gainInfo) {
      gainInfo.gainNode.gain.setValueAtTime(track.volume, this.audioContext.currentTime);
    }
  }

  setTrackPitch(trackId: string, pitchRate: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.pitch = Math.max(0.5, Math.min(2.0, pitchRate));
  }

  // --- Output Connection ---

  connectTo(destination: AudioNode): void {
    this.masterGain.disconnect();
    this.masterGain.connect(destination);
    this.outputNode = destination;
  }

  // --- UI Callbacks ---

  getStepCallback(callback: (step: number) => void): () => void {
    this.stepCallbacks.push(callback);
    return () => {
      this.stepCallbacks = this.stepCallbacks.filter((cb) => cb !== callback);
    };
  }

  // --- Pattern Operations ---

  clearTrack(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    track.steps = new Array(this.maxSteps).fill(false);
  }

  clearAll(): void {
    for (const track of this.tracks.values()) {
      track.steps = new Array(this.maxSteps).fill(false);
    }
  }

  duplicatePattern(trackId: string): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    const patternLen = track.patternLength;
    const sourceSteps = track.steps.slice(0, patternLen);

    // Duplicate into the second half if pattern length allows doubling
    if (patternLen * 2 <= this.maxSteps) {
      for (let i = 0; i < patternLen; i++) {
        track.steps[patternLen + i] = sourceSteps[i];
      }
      track.patternLength = patternLen * 2;
    }
  }

  shiftPattern(trackId: string, steps: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;

    const patternLen = track.patternLength;
    const pattern = track.steps.slice(0, patternLen);

    // Normalize shift to positive index
    let shift = steps % patternLen;
    if (shift < 0) shift += patternLen;

    const shifted = [...pattern.slice(shift), ...pattern.slice(0, shift)];
    for (let i = 0; i < patternLen; i++) {
      track.steps[i] = shifted[i];
    }
  }

  getPattern(trackId: string): boolean[] | null {
    const track = this.tracks.get(trackId);
    if (!track) return null;
    return track.steps.slice(0, track.patternLength);
  }

  // --- State Accessors ---

  get isPlaying(): boolean {
    return this.playing;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get currentStep(): number {
    return this._currentStep;
  }

  getTracks(): StepSequencerTrack[] {
    return this.trackOrder.map((id) => {
      const track = this.tracks.get(id)!;
      return { ...track };
    });
  }

  getTrack(trackId: string): StepSequencerTrack | null {
    const track = this.tracks.get(trackId);
    return track ? { ...track } : null;
  }

  getBpm(): number {
    return this.bpm;
  }

  getSwing(): number {
    return this.swing;
  }

  // --- Cleanup ---

  destroy(): void {
    this.stop();
    this.stepCallbacks = [];

    for (const gainInfo of this.trackGainNodes.values()) {
      gainInfo.gainNode.disconnect();
    }
    this.trackGainNodes.clear();

    this.masterGain.disconnect();
    this.tracks.clear();
    this.trackOrder = [];
  }
}
