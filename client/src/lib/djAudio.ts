import { initAudioContext } from "./audio";

// Types and interfaces for DJ functionality
export interface DJTrackInfo {
  title: string;
  artist: string;
  duration: number;
  url?: string;
  file?: File;
  bpm?: number;
  key?: string;
}

export interface CuePoint {
  id: string;
  name: string;
  time: number;
  color: string;
}

export interface LoopPoint {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
}

// DJ Deck class - represents a single audio deck
export class DJDeck {
  public id: string;
  public isPlaying: boolean = false;
  public currentTime: number = 0;
  public duration: number = 0;
  public volume: number = 1.0;
  public pitchRate: number = 1.0; // 1.0 = normal speed, 0.88-1.12 = +/-12%
  public trackInfo: DJTrackInfo | null = null;
  public cuePoints: CuePoint[] = [];
  public loops: LoopPoint[] = [];
  
  // Web Audio API nodes
  private audioBuffer: AudioBuffer | null = null;
  private bufferSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  
  // Connection management
  private outputDestination: AudioNode | null = null;
  
  // Playback state tracking
  private startTime: number = 0;
  private pauseTime: number = 0;
  private playbackStartOffset: number = 0; // Track the offset when playback started
  private animationFrameId: number | null = null;
  
  // Event handlers
  private onTimeUpdateCallback?: (time: number) => void;
  private onPlayStateChangeCallback?: (isPlaying: boolean) => void;
  private onTrackEndCallback?: () => void;

  constructor(id: string) {
    this.id = id;
    this.ensureNodesInitialized();
  }

  // Initialize audio context and nodes
  private initializeNodes(): void {
    if (!this.audioContext) {
      this.audioContext = initAudioContext();
    }

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;

    // Create analyser node for visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Connect nodes: gain -> analyser
    this.gainNode.connect(this.analyserNode);
    
    // If we have a stored destination, connect to it now
    if (this.outputDestination) {
      this.analyserNode.connect(this.outputDestination);
    }
  }
  
  // Ensure nodes are initialized (can be called safely multiple times)
  private ensureNodesInitialized(): void {
    if (!this.audioContext || !this.gainNode || !this.analyserNode) {
      this.initializeNodes();
    }
  }

  // Load track from URL or File
  async loadTrack(source: string | File, trackInfo: DJTrackInfo): Promise<void> {
    try {
      this.stop(); // Stop current playback if any
      
      let arrayBuffer: ArrayBuffer;
      
      if (typeof source === 'string') {
        // Load from URL
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
      } else {
        // Load from File object
        arrayBuffer = await source.arrayBuffer();
      }

      this.ensureNodesInitialized();

      // Decode audio data
      this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      this.duration = this.audioBuffer.duration;
      this.trackInfo = { ...trackInfo, duration: this.duration };
      
      console.log(`Track loaded on ${this.id}: ${trackInfo.title} - ${trackInfo.artist} (${this.duration.toFixed(2)}s)`);
    } catch (error) {
      console.error(`Error loading track on ${this.id}:`, error);
      throw new Error(`Failed to load track: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Play the track
  play(): void {
    if (!this.audioBuffer || !this.audioContext || !this.gainNode) {
      console.warn(`Cannot play: No track loaded on ${this.id}`);
      return;
    }

    if (this.isPlaying) {
      return; // Already playing
    }

    // Create new buffer source
    this.bufferSource = this.audioContext.createBufferSource();
    this.bufferSource.buffer = this.audioBuffer;
    this.bufferSource.playbackRate.value = this.pitchRate;
    
    // Connect to gain node
    this.bufferSource.connect(this.gainNode);
    
    // Handle track end
    this.bufferSource.onended = () => {
      if (this.isPlaying) { // Only trigger if we're still supposed to be playing
        this.stop();
        this.onTrackEndCallback?.();
      }
    };

    // Start playback
    const offset = this.pauseTime || this.currentTime;
    this.bufferSource.start(0, offset);
    this.startTime = this.audioContext.currentTime;
    this.playbackStartOffset = offset;
    this.isPlaying = true;
    
    // Start time tracking
    this.startTimeTracking();
    
    this.onPlayStateChangeCallback?.(true);
    console.log(`Playing ${this.id} from ${offset.toFixed(2)}s`);
  }

  // Pause the track
  pause(): void {
    if (!this.isPlaying || !this.bufferSource) {
      return;
    }

    this.bufferSource.stop();
    this.bufferSource = null;
    this.pauseTime = this.currentTime;
    this.isPlaying = false;
    
    this.stopTimeTracking();
    this.onPlayStateChangeCallback?.(false);
    console.log(`Paused ${this.id} at ${this.pauseTime.toFixed(2)}s`);
  }

  // Stop the track and reset to beginning
  stop(): void {
    if (this.bufferSource) {
      this.bufferSource.stop();
      this.bufferSource = null;
    }
    
    this.isPlaying = false;
    this.currentTime = 0;
    this.pauseTime = 0;
    this.startTime = 0;
    
    this.stopTimeTracking();
    this.onPlayStateChangeCallback?.(false);
    console.log(`Stopped ${this.id}`);
  }

  // Seek to specific time position
  seek(time: number): void {
    if (!this.audioBuffer) {
      return;
    }

    const clampedTime = Math.max(0, Math.min(time, this.duration));
    const wasPlaying = this.isPlaying;
    
    if (this.isPlaying) {
      this.pause();
    }
    
    this.currentTime = clampedTime;
    this.pauseTime = clampedTime;
    
    if (wasPlaying) {
      this.play();
    }
    
    console.log(`Seeked ${this.id} to ${clampedTime.toFixed(2)}s`);
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioContext!.currentTime);
    }
  }

  // Set pitch rate (0.5 to 2.0, where 1.0 is normal speed)
  setPitchRate(rate: number): void {
    this.pitchRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.bufferSource) {
      this.bufferSource.playbackRate.setValueAtTime(this.pitchRate, this.audioContext!.currentTime);
    }
  }

  // Get pitch rate as percentage (-50% to +100%)
  getPitchPercentage(): number {
    return (this.pitchRate - 1.0) * 100;
  }

  // Set pitch rate from percentage
  setPitchPercentage(percentage: number): void {
    const rate = 1.0 + (percentage / 100);
    this.setPitchRate(rate);
  }

  // Connect deck output to destination (mixer input)
  connectTo(destination: AudioNode): void {
    this.outputDestination = destination;
    this.ensureNodesInitialized();
    
    if (this.analyserNode) {
      // Disconnect from previous destinations first
      this.analyserNode.disconnect();
      // Connect to new destination
      this.analyserNode.connect(destination);
      console.log(`${this.id} connected to mixer`);
    }
  }

  // Disconnect from all destinations
  disconnect(): void {
    if (this.analyserNode) {
      this.analyserNode.disconnect();
    }
    this.outputDestination = null;
  }

  // Get frequency data for visualization
  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(0);
    }
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  // Get time domain data for waveform visualization
  getTimeDomainData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(0);
    }
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  // Cue point management
  addCuePoint(name: string, time: number, color: string = "#ff0000"): CuePoint {
    const cuePoint: CuePoint = {
      id: crypto.randomUUID(),
      name,
      time,
      color
    };
    this.cuePoints.push(cuePoint);
    return cuePoint;
  }

  removeCuePoint(id: string): void {
    this.cuePoints = this.cuePoints.filter(cue => cue.id !== id);
  }

  jumpToCue(id: string): void {
    const cuePoint = this.cuePoints.find(cue => cue.id === id);
    if (cuePoint) {
      this.seek(cuePoint.time);
    }
  }

  // Loop management
  addLoop(name: string, startTime: number, endTime: number): LoopPoint {
    const loop: LoopPoint = {
      id: crypto.randomUUID(),
      name,
      startTime,
      endTime,
      isActive: false
    };
    this.loops.push(loop);
    return loop;
  }

  removeLoop(id: string): void {
    this.loops = this.loops.filter(loop => loop.id !== id);
  }

  toggleLoop(id: string): void {
    const loop = this.loops.find(l => l.id === id);
    if (loop) {
      loop.isActive = !loop.isActive;
    }
  }

  // Event handler setters
  onTimeUpdate(callback: (time: number) => void): void {
    this.onTimeUpdateCallback = callback;
  }

  onPlayStateChange(callback: (isPlaying: boolean) => void): void {
    this.onPlayStateChangeCallback = callback;
  }

  onTrackEnd(callback: () => void): void {
    this.onTrackEndCallback = callback;
  }

  // Private methods for time tracking
  private startTimeTracking(): void {
    this.stopTimeTracking(); // Clear any existing tracking
    
    const updateTime = () => {
      if (this.isPlaying && this.audioContext) {
        // Calculate current time accounting for pitch rate
        const elapsedContextTime = this.audioContext.currentTime - this.startTime;
        this.currentTime = this.playbackStartOffset + (elapsedContextTime * this.pitchRate);
        
        // Check for active loops
        const activeLoop = this.loops.find(loop => loop.isActive);
        if (activeLoop && this.currentTime >= activeLoop.endTime) {
          this.seek(activeLoop.startTime);
          return; // Don't schedule next frame since seek will restart tracking
        }
        
        // Check if track ended (accounting for pitch rate)
        if (this.currentTime >= this.duration) {
          this.stop();
          this.onTrackEndCallback?.();
          return;
        }
        
        this.onTimeUpdateCallback?.(this.currentTime);
        this.animationFrameId = requestAnimationFrame(updateTime);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(updateTime);
  }

  private stopTimeTracking(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Cleanup method
  destroy(): void {
    this.stop();
    this.disconnect();
    this.cuePoints = [];
    this.loops = [];
    this.audioBuffer = null;
    this.trackInfo = null;
  }
}

// DJ Mixer class - manages both decks and crossfader
export class DJMixer {
  public deckA: DJDeck;
  public deckB: DJDeck;
  public crossfaderPosition: number = 0.5; // 0.0 = full A, 1.0 = full B
  public masterVolume: number = 1.0;
  
  // Web Audio API nodes
  private audioContext: AudioContext | null = null;
  private deckAGain: GainNode | null = null;
  private deckBGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private outputNode: GainNode | null = null;

  constructor() {
    this.deckA = new DJDeck('Deck A');
    this.deckB = new DJDeck('Deck B');
    this.initializeMixer();
  }

  // Initialize mixer audio nodes
  private initializeMixer(): void {
    this.audioContext = initAudioContext();
    
    // Create gain nodes for each deck
    this.deckAGain = this.audioContext.createGain();
    this.deckBGain = this.audioContext.createGain();
    this.masterGain = this.audioContext.createGain();
    this.outputNode = this.audioContext.createGain();
    
    // Set initial values
    this.masterGain.gain.value = this.masterVolume;
    this.outputNode.gain.value = 1.0;
    
    // Connect mixer chain: deckGain -> masterGain -> outputNode -> destination
    this.deckAGain.connect(this.masterGain);
    this.deckBGain.connect(this.masterGain);
    this.masterGain.connect(this.outputNode);
    this.outputNode.connect(this.audioContext.destination);
    
    // Connect decks to their respective gain nodes
    this.deckA.connectTo(this.deckAGain);
    this.deckB.connectTo(this.deckBGain);
    
    // Update crossfader
    this.updateCrossfader();
    
    console.log('DJ Mixer initialized');
  }

  // Set crossfader position (0.0 = full Deck A, 1.0 = full Deck B)
  setCrossfader(position: number): void {
    this.crossfaderPosition = Math.max(0, Math.min(1, position));
    this.updateCrossfader();
  }

  // Update gain values based on crossfader position
  private updateCrossfader(): void {
    if (!this.deckAGain || !this.deckBGain || !this.audioContext) {
      return;
    }

    // Calculate gain values using equal power crossfading
    const deckAGain = Math.cos(this.crossfaderPosition * Math.PI / 2);
    const deckBGain = Math.sin(this.crossfaderPosition * Math.PI / 2);
    
    // Apply gains smoothly
    const currentTime = this.audioContext.currentTime;
    this.deckAGain.gain.setTargetAtTime(deckAGain, currentTime, 0.01);
    this.deckBGain.gain.setTargetAtTime(deckBGain, currentTime, 0.01);
  }

  // Set master volume
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
    }
  }

  // Get crossfader position as percentage (0% = full A, 100% = full B)
  getCrossfaderPercentage(): number {
    return this.crossfaderPosition * 100;
  }

  // Set crossfader from percentage
  setCrossfaderPercentage(percentage: number): void {
    this.setCrossfader(percentage / 100);
  }

  // Sync deck tempos (match Deck B to Deck A's tempo)
  syncTempos(): void {
    if (this.deckA.trackInfo?.bpm && this.deckB.trackInfo?.bpm) {
      const tempoRatio = this.deckA.trackInfo.bpm / this.deckB.trackInfo.bpm;
      this.deckB.setPitchRate(tempoRatio);
      console.log(`Synced Deck B tempo to Deck A: ${tempoRatio.toFixed(3)}x`);
    }
  }

  // Get combined frequency data from both decks
  getCombinedFrequencyData(): { deckA: Uint8Array; deckB: Uint8Array; combined: Uint8Array } {
    const deckAData = this.deckA.getFrequencyData();
    const deckBData = this.deckB.getFrequencyData();
    
    // Create combined data by mixing based on crossfader position
    const combined = new Uint8Array(Math.max(deckAData.length, deckBData.length));
    const deckAGain = Math.cos(this.crossfaderPosition * Math.PI / 2);
    const deckBGain = Math.sin(this.crossfaderPosition * Math.PI / 2);
    
    for (let i = 0; i < combined.length; i++) {
      const aValue = i < deckAData.length ? deckAData[i] : 0;
      const bValue = i < deckBData.length ? deckBData[i] : 0;
      combined[i] = Math.round(aValue * deckAGain + bValue * deckBGain);
    }
    
    return { deckA: deckAData, deckB: deckBData, combined };
  }

  // Load tracks into both decks
  async loadTracks(deckASource: string | File, deckAInfo: DJTrackInfo, 
                   deckBSource: string | File, deckBInfo: DJTrackInfo): Promise<void> {
    try {
      await Promise.all([
        this.deckA.loadTrack(deckASource, deckAInfo),
        this.deckB.loadTrack(deckBSource, deckBInfo)
      ]);
      console.log('Both tracks loaded successfully');
    } catch (error) {
      console.error('Error loading tracks:', error);
      throw error;
    }
  }

  // Emergency stop - stops both decks immediately
  emergencyStop(): void {
    this.deckA.stop();
    this.deckB.stop();
    console.log('Emergency stop triggered');
  }

  // Get mixer status
  getStatus() {
    return {
      crossfaderPosition: this.crossfaderPosition,
      crossfaderPercentage: this.getCrossfaderPercentage(),
      masterVolume: this.masterVolume,
      deckA: {
        isPlaying: this.deckA.isPlaying,
        currentTime: this.deckA.currentTime,
        duration: this.deckA.duration,
        volume: this.deckA.volume,
        pitchRate: this.deckA.pitchRate,
        pitchPercentage: this.deckA.getPitchPercentage(),
        trackInfo: this.deckA.trackInfo
      },
      deckB: {
        isPlaying: this.deckB.isPlaying,
        currentTime: this.deckB.currentTime,
        duration: this.deckB.duration,
        volume: this.deckB.volume,
        pitchRate: this.deckB.pitchRate,
        pitchPercentage: this.deckB.getPitchPercentage(),
        trackInfo: this.deckB.trackInfo
      }
    };
  }

  // Cleanup method
  destroy(): void {
    this.deckA.destroy();
    this.deckB.destroy();
    
    if (this.outputNode) {
      this.outputNode.disconnect();
    }
    
    console.log('DJ Mixer destroyed');
  }
}

// Utility functions for DJ operations
export class DJUtils {
  // Calculate BPM from two tracks for beatmatching
  static calculateBPMRatio(bpm1: number, bpm2: number): number {
    return bpm1 / bpm2;
  }

  // Convert time to MM:SS format
  static formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Convert pitch percentage to semitones (for musical context)
  static pitchPercentageToSemitones(percentage: number): number {
    return Math.log2(1 + percentage / 100) * 12;
  }

  // Convert semitones to pitch percentage
  static semitonesToPitchPercentage(semitones: number): number {
    return (Math.pow(2, semitones / 12) - 1) * 100;
  }

  // Detect if two tracks are in compatible keys (simple version)
  static areKeysCompatible(key1: string, key2: string): boolean {
    // This is a simplified version - in practice you'd want a full harmonic mixing system
    const compatibleKeys: Record<string, string[]> = {
      'Am': ['Am', 'C', 'Em', 'G', 'F', 'Dm'],
      'C': ['C', 'Am', 'F', 'G', 'Em', 'Dm'],
      'Gm': ['Gm', 'Bb', 'Dm', 'F', 'Eb', 'Cm'],
      // Add more key compatibility mappings as needed
    };

    return compatibleKeys[key1]?.includes(key2) || false;
  }
}

// Export singleton mixer instance
export const djMixer = new DJMixer();