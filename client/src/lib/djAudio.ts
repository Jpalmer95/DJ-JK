import { initAudioContext } from "./audio";
import { EffectsChain, EffectFactory, BaseEffect, EffectPreset } from "./audioEffects";

// Types and interfaces for professional DJ functionality
export interface DJTrackInfo {
  title: string;
  artist: string;
  duration: number;
  url?: string;
  file?: File;
  bpm?: number;
  detectedBpm?: number;
  key?: string;
  detectedKey?: string;
  camelotKey?: string;
  energy?: number;
  genre?: string;
  waveformData?: number[];
  beatGrid?: number[];
}

export interface CuePoint {
  id: string;
  name: string;
  time: number;
  color: string;
  hotCueNumber?: number; // 1-8 for hot cues
  type: 'hot' | 'memory' | 'loop';
}

export interface LoopPoint {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  beatLength?: number; // Length in beats
  isRoll?: boolean; // Loop roll that returns to original position
}

export interface BeatJumpOptions {
  beats: number;
  direction: 'forward' | 'backward';
}

export interface SyncState {
  isSynced: boolean;
  masterDeck?: string;
  beatOffset: number;
  phase: number;
  driftCorrection: number; // Accumulated drift correction
  lastSyncTime: number; // When sync was last updated
  syncAccuracy: number; // Phase accuracy meter (0-1, 1 = perfect)
}

export interface KeyInfo {
  detected: string;
  camelot: string;
  openKey: string;
  isCompatible: boolean;
}

// Professional DJ Deck class - represents a single audio deck
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
  
  // Professional DJ features
  public bpm: number = 120;
  public detectedBpm: number = 120;
  public keyLock: boolean = false;
  public syncState: SyncState = { 
    isSynced: false, 
    beatOffset: 0, 
    phase: 0, 
    driftCorrection: 0, 
    lastSyncTime: 0, 
    syncAccuracy: 0 
  };
  public hotCues: (CuePoint | null)[] = new Array(8).fill(null); // 8 hot cue slots
  public beatGrid: number[] = [];
  public currentBeat: number = 0;
  public beatsPerBar: number = 4;
  
  // Auto loop presets (in beats)
  public autoLoopSizes: number[] = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
  public currentAutoLoop: number | null = null;
  public loopRollActive: boolean = false;
  public loopRollReturn: number = 0;
  
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
  private onBeatCallback?: (beat: number) => void;
  private onBpmDetectedCallback?: (bpm: number) => void;
  private onKeyDetectedCallback?: (key: KeyInfo) => void;
  private onAnalysisCompleteCallback?: () => void;
  private onTrackLoadedCallback?: (trackInfo: DJTrackInfo) => void;
  private onCueChangeCallback?: (cuePoints: CuePoint[]) => void;
  private onLoopChangeCallback?: (loops: LoopPoint[]) => void;
  private onSyncStateChangeCallback?: (syncState: SyncState) => void;
  
  // Analysis state
  private isAnalyzing: boolean = false;
  private analysisWorker: Worker | null = null;
  
  // Key information properly exposed
  public keyInfo: KeyInfo | null = null;
  
  // Track ID for persistence (UUID from database)
  public trackId: string | null = null;
  
  // Professional effects chain
  public effectsChain: EffectsChain;
  private effectsEnabled: boolean = true;
  
  // Effects event handlers
  private onEffectChangeCallback?: (effectId: string, parameter: string, value: number) => void;
  private onEffectBypassCallback?: (effectId: string, bypassed: boolean) => void;

  constructor(id: string) {
    this.id = id;
    this.effectsChain = new EffectsChain();
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

    // Connect audio graph: gain -> effects -> analyser -> output
    this.gainNode.connect(this.effectsChain.inputNode);
    this.effectsChain.connectTo(this.analyserNode);
    
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

  // Load track from URL or File with professional analysis
  async loadTrack(source: string | File, trackInfo: DJTrackInfo): Promise<void> {
    try {
      this.stop(); // Stop current playback if any
      this.isAnalyzing = true;
      
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
      
      // Start professional audio analysis
      await this.analyzeTrack();
      
      this.isAnalyzing = false;
      this.onTrackLoadedCallback?.(this.trackInfo!);
      console.log(`Track loaded on ${this.id}: ${trackInfo.title} - ${trackInfo.artist} (${this.duration.toFixed(2)}s, ${this.detectedBpm.toFixed(1)} BPM)`);
    } catch (error) {
      this.isAnalyzing = false;
      console.error(`Error loading track on ${this.id}:`, error);
      throw new Error(`Failed to load track: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Professional track analysis (BPM, key, beat grid)
  private async analyzeTrack(): Promise<void> {
    if (!this.audioBuffer) return;
    
    try {
      // Analyze BPM using onset detection
      this.detectedBpm = await this.detectBPM();
      this.bpm = this.trackInfo?.bpm || this.detectedBpm;
      
      // Generate beat grid
      this.generateBeatGrid();
      
      // Generate waveform data for visualization
      this.generateWaveformData();
      
      // Detect musical key (simplified implementation)
      const detectedKey = await this.detectKey();
      if (detectedKey) {
        this.trackInfo!.detectedKey = detectedKey.detected;
        this.trackInfo!.camelotKey = detectedKey.camelot;
        this.keyInfo = detectedKey;
        this.onKeyDetectedCallback?.(detectedKey);
      }
      
      this.onBpmDetectedCallback?.(this.detectedBpm);
      this.onAnalysisCompleteCallback?.();
    } catch (error) {
      console.warn('Track analysis failed:', error);
    }
  }
  
  // BPM detection using tempo analysis
  private async detectBPM(): Promise<number> {
    if (!this.audioBuffer) return 120;
    
    // Simplified BPM detection using onset analysis
    const channelData = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    
    // Use a simplified beat detection algorithm
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
    const hopSize = Math.floor(windowSize / 2);
    const onsets: number[] = [];
    
    let previousEnergy = 0;
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = i; j < i + windowSize; j++) {
        energy += channelData[j] * channelData[j];
      }
      energy = Math.sqrt(energy / windowSize);
      
      // Detect energy increases (potential beats)
      if (energy > previousEnergy * 1.3 && energy > 0.01) {
        onsets.push(i / sampleRate);
      }
      previousEnergy = energy;
    }
    
    if (onsets.length < 2) return 120;
    
    // Calculate intervals between onsets
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    
    // Find most common interval (tempo)
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    // Convert to BPM
    const bpm = 60 / medianInterval;
    
    // Clamp to reasonable range
    return Math.max(60, Math.min(200, bpm));
  }
  
  // Musical key detection (simplified)
  private async detectKey(): Promise<KeyInfo | null> {
    if (!this.audioBuffer) return null;
    
    // This is a simplified key detection - in practice you'd use more sophisticated algorithms
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['maj', 'min'];
    
    // For demo purposes, return a random key
    // In production, you'd analyze the audio spectrum
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    const detected = `${randomKey}${randomMode}`;
    
    return {
      detected,
      camelot: this.convertToCamelot(detected),
      openKey: this.convertToOpenKey(detected),
      isCompatible: true
    };
  }
  
  // Convert key to Camelot notation
  private convertToCamelot(key: string): string {
    const camelotMap: Record<string, string> = {
      'Cmaj': '8B', 'Amin': '8A', 'Gmaj': '9B', 'Emin': '9A',
      'Dmaj': '10B', 'Bmin': '10A', 'Amaj': '11B', 'F#min': '11A',
      'Emaj': '12B', 'C#min': '12A', 'Bmaj': '1B', 'G#min': '1A',
      'F#maj': '2B', 'D#min': '2A', 'C#maj': '3B', 'A#min': '3A',
      'G#maj': '4B', 'Fmin': '4A', 'D#maj': '5B', 'Cmin': '5A',
      'A#maj': '6B', 'Gmin': '6A', 'Fmaj': '7B', 'Dmin': '7A'
    };
    return camelotMap[key] || '1A';
  }
  
  // Convert key to Open Key notation
  private convertToOpenKey(key: string): string {
    const openKeyMap: Record<string, string> = {
      'Cmaj': '1d', 'Amin': '1m', 'Gmaj': '2d', 'Emin': '2m',
      'Dmaj': '3d', 'Bmin': '3m', 'Amaj': '4d', 'F#min': '4m',
      'Emaj': '5d', 'C#min': '5m', 'Bmaj': '6d', 'G#min': '6m',
      'F#maj': '7d', 'D#min': '7m', 'C#maj': '8d', 'A#min': '8m',
      'G#maj': '9d', 'Fmin': '9m', 'D#maj': '10d', 'Cmin': '10m',
      'A#maj': '11d', 'Gmin': '11m', 'Fmaj': '12d', 'Dmin': '12m'
    };
    return openKeyMap[key] || '1m';
  }
  
  // Generate beat grid based on detected BPM
  private generateBeatGrid(): void {
    if (!this.duration || this.detectedBpm <= 0) return;
    
    const beatInterval = 60 / this.detectedBpm; // Time between beats in seconds
    this.beatGrid = [];
    
    for (let time = 0; time < this.duration; time += beatInterval) {
      this.beatGrid.push(time);
    }
  }
  
  // Generate waveform data for visualization without redundant audio loading
  private generateWaveformData(): void {
    if (!this.audioBuffer) return;
    
    const channelData = this.audioBuffer.getChannelData(0);
    const waveformLength = 1024; // High resolution for professional display
    const waveform = new Array(waveformLength);
    
    // Downsample the audio data to fit our visualization
    const blockSize = Math.floor(channelData.length / waveformLength);
    for (let i = 0; i < waveformLength; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j] || 0);
      }
      waveform[i] = sum / blockSize;
    }
    
    if (this.trackInfo) {
      this.trackInfo.waveformData = waveform;
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

  // Professional Effects Management
  
  // Add effect to the effects chain
  addEffect(effectType: string, effectId?: string): BaseEffect {
    const effect = EffectFactory.createEffect(effectType, effectId);
    this.effectsChain.addEffect(effect);
    console.log(`Added ${effectType} effect to ${this.id}`);
    return effect;
  }
  
  // Remove effect from chain
  removeEffect(effectId: string): boolean {
    this.effectsChain.removeEffect(effectId);
    console.log(`Removed effect ${effectId} from ${this.id}`);
    return true;
  }
  
  // Get effect by ID
  getEffect(effectId: string): BaseEffect | undefined {
    return this.effectsChain.getEffect(effectId);
  }
  
  // Get all effects in chain
  getEffects(): BaseEffect[] {
    return this.effectsChain.getEffects();
  }
  
  // Set effect parameter with smooth transitions
  setEffectParameter(effectId: string, parameterName: string, value: number): void {
    const effect = this.getEffect(effectId);
    if (effect) {
      effect.setParameter(parameterName, value);
      this.onEffectChangeCallback?.(effectId, parameterName, value);
    }
  }
  
  // Get effect parameter value
  getEffectParameter(effectId: string, parameterName: string): number {
    const effect = this.getEffect(effectId);
    return effect ? effect.getParameter(parameterName) : 0;
  }
  
  // Bypass/enable individual effect
  setEffectBypass(effectId: string, bypass: boolean): void {
    const effect = this.getEffect(effectId);
    if (effect) {
      effect.setBypass(bypass);
      this.onEffectBypassCallback?.(effectId, bypass);
      console.log(`${bypass ? 'Bypassed' : 'Enabled'} effect ${effectId} on ${this.id}`);
    }
  }
  
  // Enable/disable entire effects chain
  setEffectsEnabled(enabled: boolean): void {
    this.effectsEnabled = enabled;
    this.effectsChain.setMasterBypass(!enabled);
    console.log(`Effects ${enabled ? 'enabled' : 'disabled'} on ${this.id}`);
  }
  
  // Check if effects are enabled
  areEffectsEnabled(): boolean {
    return this.effectsEnabled;
  }
  
  // Reorder effects in chain
  reorderEffect(effectId: string, newIndex: number): void {
    this.effectsChain.reorderEffect(effectId, newIndex);
    console.log(`Reordered effect ${effectId} to position ${newIndex} on ${this.id}`);
  }
  
  // Save current effects preset
  saveEffectsPreset(presetName: string): EffectPreset[] {
    const presets = this.effectsChain.savePresets();
    console.log(`Saved effects preset "${presetName}" for ${this.id} with ${presets.length} effects`);
    return presets;
  }
  
  // Load effects preset
  loadEffectsPreset(presets: EffectPreset[]): void {
    this.effectsChain.loadPresets(presets);
    console.log(`Loaded effects preset with ${presets.length} effects on ${this.id}`);
  }
  
  // Clear all effects
  clearAllEffects(): void {
    const effects = this.getEffects();
    effects.forEach(effect => this.removeEffect(effect.id));
    console.log(`Cleared all effects from ${this.id}`);
  }
  
  // Sync effect parameters to BPM (for beat-synced effects)
  syncEffectsToBPM(): void {
    const currentBPM = this.bpm || this.detectedBpm;
    if (currentBPM <= 0) return;
    
    this.getEffects().forEach(effect => {
      if (effect.effectType === 'Delay' && effect.getParameter('sync') === 1) {
        // Sync delay time to quarter notes by default
        const beatTime = 60 / currentBPM;
        const delayTime = beatTime; // Quarter note
        effect.setParameter('time', Math.min(delayTime, 1.0));
      }
      
      if (effect.effectType === 'Phaser' || effect.effectType === 'Flanger') {
        // Optionally sync LFO rate to BPM divisions
        const syncParam = effect.getParameter('sync');
        if (syncParam === 1) {
          const lfoRate = (currentBPM / 60) / 4; // Synced to quarter notes
          effect.setParameter('rate', lfoRate);
        }
      }
    });
    
    console.log(`Synced effects to BPM ${currentBPM} on ${this.id}`);
  }
  
  // Add default EQ effect (always present)
  initializeDefaultEffects(): void {
    if (!this.getEffect('eq3')) {
      this.addEffect('ThreeBandEQ', 'eq3');
    }
  }
  
  // Set effect event handlers
  onEffectChange(callback: (effectId: string, parameter: string, value: number) => void): void {
    this.onEffectChangeCallback = callback;
  }
  
  onEffectBypass(callback: (effectId: string, bypassed: boolean) => void): void {
    this.onEffectBypassCallback = callback;
  }
  
  // Get effects chain for direct access
  getEffectsChain(): EffectsChain {
    return this.effectsChain;
  }

  // Professional hot cue management (8 slots)
  setHotCue(slotNumber: number, time?: number): void {
    if (slotNumber < 1 || slotNumber > 8) return;
    
    const currentTime = time !== undefined ? time : this.currentTime;
    const colors = ['#ff0000', '#00ff00', '#0066ff', '#ffff00', '#ff6600', '#9900ff', '#00ffff', '#ff00ff'];
    
    const cuePoint: CuePoint = {
      id: crypto.randomUUID(),
      name: `Hot Cue ${slotNumber}`,
      time: currentTime,
      color: colors[slotNumber - 1],
      hotCueNumber: slotNumber,
      type: 'hot'
    };
    
    this.hotCues[slotNumber - 1] = cuePoint;
    
    // Also add to general cue points list
    this.cuePoints = this.cuePoints.filter(cue => cue.hotCueNumber !== slotNumber);
    this.cuePoints.push(cuePoint);
    
    // Fire event immediately
    this.onCueChangeCallback?.([...this.cuePoints]);
  }
  
  clearHotCue(slotNumber: number): void {
    if (slotNumber < 1 || slotNumber > 8) return;
    
    this.hotCues[slotNumber - 1] = null;
    this.cuePoints = this.cuePoints.filter(cue => cue.hotCueNumber !== slotNumber);
    
    // Fire event immediately
    this.onCueChangeCallback?.([...this.cuePoints]);
  }
  
  jumpToHotCue(slotNumber: number): void {
    if (slotNumber < 1 || slotNumber > 8) return;
    
    const cuePoint = this.hotCues[slotNumber - 1];
    if (cuePoint) {
      this.seek(cuePoint.time);
    }
  }
  
  addCuePoint(name: string, time: number, color: string = "#ff0000", type: 'hot' | 'memory' | 'loop' = 'memory'): CuePoint {
    const cuePoint: CuePoint = {
      id: crypto.randomUUID(),
      name,
      time,
      color,
      type
    };
    this.cuePoints.push(cuePoint);
    
    // Fire event immediately
    this.onCueChangeCallback?.([...this.cuePoints]);
    
    return cuePoint;
  }

  removeCuePoint(id: string): void {
    this.cuePoints = this.cuePoints.filter(cue => cue.id !== id);
    
    // Also clear from hot cues if it's a hot cue
    for (let i = 0; i < this.hotCues.length; i++) {
      if (this.hotCues[i]?.id === id) {
        this.hotCues[i] = null;
        break;
      }
    }
    
    // Fire event immediately
    this.onCueChangeCallback?.([...this.cuePoints]);
  }

  jumpToCue(id: string): void {
    const cuePoint = this.cuePoints.find(cue => cue.id === id);
    if (cuePoint) {
      this.seek(cuePoint.time);
    }
  }

  // Professional loop management
  setAutoLoop(beats: number): void {
    if (!this.beatGrid.length || this.detectedBpm <= 0) return;
    
    const beatLength = 60 / this.detectedBpm;
    const loopLength = beatLength * beats;
    
    // Find nearest beat to current position
    const nearestBeat = this.findNearestBeat(this.currentTime);
    const startTime = nearestBeat;
    const endTime = startTime + loopLength;
    
    // Ensure loop doesn't exceed track duration
    if (endTime > this.duration) return;
    
    // Clear existing auto loop
    this.clearAutoLoop();
    
    const loop: LoopPoint = {
      id: crypto.randomUUID(),
      name: `${beats} Beat Loop`,
      startTime,
      endTime,
      isActive: true,
      beatLength: beats
    };
    
    this.loops.push(loop);
    this.currentAutoLoop = beats;
    
    // Fire event immediately
    this.onLoopChangeCallback?.([...this.loops]);
    
    console.log(`Set ${beats} beat loop from ${startTime.toFixed(2)}s to ${endTime.toFixed(2)}s`);
  }
  
  clearAutoLoop(): void {
    if (this.currentAutoLoop !== null) {
      this.loops = this.loops.filter(loop => loop.beatLength !== this.currentAutoLoop);
      this.currentAutoLoop = null;
      
      // Fire event immediately
      this.onLoopChangeCallback?.([...this.loops]);
    }
  }
  
  // Loop roll - temporary loop that returns to original position
  startLoopRoll(beats: number): void {
    if (this.loopRollActive) return;
    
    this.loopRollReturn = this.currentTime;
    this.loopRollActive = true;
    this.setAutoLoop(beats);
    
    // Find the loop we just created
    const rollLoop = this.loops.find(loop => loop.beatLength === beats && loop.isActive);
    if (rollLoop) {
      rollLoop.isRoll = true;
    }
  }
  
  stopLoopRoll(): void {
    if (!this.loopRollActive) return;
    
    // Remove loop roll
    this.loops = this.loops.filter(loop => !loop.isRoll);
    
    // Return to original position
    this.seek(this.loopRollReturn);
    
    this.loopRollActive = false;
    this.currentAutoLoop = null;
    
    // Fire event immediately
    this.onLoopChangeCallback?.([...this.loops]);
    
    console.log(`Loop roll ended, returned to ${this.loopRollReturn.toFixed(2)}s`);
  }
  
  // Halve or double current loop length
  adjustLoopLength(direction: 'halve' | 'double'): void {
    const activeLoop = this.loops.find(loop => loop.isActive && loop.beatLength);
    if (!activeLoop || !activeLoop.beatLength) return;
    
    const newBeats = direction === 'halve' 
      ? Math.max(0.25, activeLoop.beatLength / 2)
      : Math.min(32, activeLoop.beatLength * 2);
    
    // Remove current loop and set new one
    this.removeLoop(activeLoop.id);
    this.setAutoLoop(newBeats);
  }
  
  // Find nearest beat position
  private findNearestBeat(time: number): number {
    if (!this.beatGrid.length) return time;
    
    let nearest = this.beatGrid[0];
    let minDistance = Math.abs(time - nearest);
    
    for (const beat of this.beatGrid) {
      const distance = Math.abs(time - beat);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = beat;
      }
    }
    
    return nearest;
  }
  
  addLoop(name: string, startTime: number, endTime: number, beatLength?: number): LoopPoint {
    const loop: LoopPoint = {
      id: crypto.randomUUID(),
      name,
      startTime,
      endTime,
      isActive: false,
      beatLength
    };
    this.loops.push(loop);
    
    // Fire event immediately
    this.onLoopChangeCallback?.([...this.loops]);
    
    return loop;
  }

  removeLoop(id: string): void {
    this.loops = this.loops.filter(loop => loop.id !== id);
    
    // Fire event immediately
    this.onLoopChangeCallback?.([...this.loops]);
  }

  toggleLoop(id: string): void {
    const loop = this.loops.find(l => l.id === id);
    if (loop) {
      loop.isActive = !loop.isActive;
      
      // Fire event immediately
      this.onLoopChangeCallback?.([...this.loops]);
    }
  }

  // Professional transport controls
  nudge(direction: 'forward' | 'backward', amount: number = 0.01): void {
    if (!this.isPlaying) return;
    
    const nudgeAmount = direction === 'forward' ? amount : -amount;
    const targetTime = Math.max(0, Math.min(this.duration, this.currentTime + nudgeAmount));
    this.seek(targetTime);
  }
  
  // Beat jump - skip by number of beats
  beatJump(beats: number, direction: 'forward' | 'backward' = 'forward'): void {
    if (this.detectedBpm <= 0) return;
    
    const beatLength = 60 / this.detectedBpm;
    const jumpAmount = beatLength * beats;
    const jumpDirection = direction === 'forward' ? 1 : -1;
    
    const targetTime = this.currentTime + (jumpAmount * jumpDirection);
    this.seek(Math.max(0, Math.min(this.duration, targetTime)));
  }
  
  // Professional phase-locked sync with continuous drift correction
  syncTo(otherDeck: DJDeck): void {
    if (!otherDeck.trackInfo || !this.trackInfo) return;
    
    const otherBpm = otherDeck.detectedBpm || otherDeck.bpm;
    const thisBpm = this.detectedBpm || this.bpm;
    
    if (otherBpm > 0 && thisBpm > 0) {
      // Sync tempo first
      const syncRatio = otherBpm / thisBpm;
      this.setPitchRate(syncRatio);
      
      // Calculate beat phase alignment with professional precision
      let beatOffset = 0;
      let phase = 0;
      let syncAccuracy = 0;
      
      if (this.beatGrid.length > 0 && otherDeck.beatGrid.length > 0) {
        // Find the exact downbeat positions for professional alignment
        const otherDownbeatTime = this.findNearestDownbeat(otherDeck.currentTime, otherDeck.beatGrid, otherDeck.beatsPerBar);
        const thisDownbeatTime = this.findNearestDownbeat(this.currentTime, this.beatGrid, this.beatsPerBar);
        
        // Calculate precise phase difference for downbeat alignment
        const otherBeatInterval = 60 / otherBpm;
        const thisBeatInterval = 60 / (thisBpm * syncRatio);
        
        // Calculate phase within the downbeat cycle for professional alignment
        const otherPhase = ((otherDeck.currentTime - otherDownbeatTime) % (otherBeatInterval * otherDeck.beatsPerBar)) / (otherBeatInterval * otherDeck.beatsPerBar);
        const thisPhase = ((this.currentTime - thisDownbeatTime) % (thisBeatInterval * this.beatsPerBar)) / (thisBeatInterval * this.beatsPerBar);
        
        // Calculate precise phase offset for downbeat alignment
        phase = otherPhase - thisPhase;
        if (phase > 0.5) phase -= 1.0;
        if (phase < -0.5) phase += 1.0;
        
        beatOffset = phase * (thisBeatInterval * this.beatsPerBar);
        
        // Calculate sync accuracy (closer to 0 phase difference = higher accuracy)
        syncAccuracy = Math.max(0, 1 - Math.abs(phase) * 2);
        
        // Apply precise phase alignment for professional mixing
        if (this.isPlaying && otherDeck.isPlaying && Math.abs(beatOffset) > 0.005) { // Tighter tolerance
          const targetTime = this.currentTime + beatOffset;
          if (targetTime >= 0 && targetTime <= this.duration) {
            this.seek(targetTime);
            console.log(`Phase aligned: ${beatOffset.toFixed(4)}s offset applied for downbeat sync`);
          }
        }
      }
      
      // Set professional sync state with drift correction tracking
      this.syncState = {
        isSynced: true,
        masterDeck: otherDeck.id,
        beatOffset: beatOffset,
        phase: phase,
        driftCorrection: 0,
        lastSyncTime: this.audioContext?.currentTime || 0,
        syncAccuracy: syncAccuracy
      };
      
      // Fire sync state change event
      this.onSyncStateChangeCallback?.(this.syncState);
      
      console.log(`${this.id} professionally synced to ${otherDeck.id}: ${syncRatio.toFixed(4)}x ratio, ${phase.toFixed(4)} phase, ${(syncAccuracy * 100).toFixed(1)}% accuracy`);
    }
  }
  
  // Find nearest downbeat for professional sync alignment
  private findNearestDownbeat(time: number, beatGrid: number[], beatsPerBar: number): number {
    if (!beatGrid.length) return time;
    
    // Find downbeats (every 4th beat typically)
    const downbeats = beatGrid.filter((_, index) => index % beatsPerBar === 0);
    
    if (!downbeats.length) return beatGrid[0] || time;
    
    let nearest = downbeats[0];
    let minDistance = Math.abs(time - nearest);
    
    for (const downbeat of downbeats) {
      const distance = Math.abs(time - downbeat);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = downbeat;
      }
    }
    
    return nearest;
  }
  
  // Unsync from master
  unsync(): void {
    this.syncState = {
      isSynced: false,
      beatOffset: 0,
      phase: 0,
      driftCorrection: 0,
      lastSyncTime: 0,
      syncAccuracy: 0
    };
    
    // Fire sync state change event
    this.onSyncStateChangeCallback?.(this.syncState);
    
    console.log(`${this.id} unsynced from master`);
  }
  
  // Set BPM manually
  setBPM(bpm: number): void {
    this.bpm = Math.max(60, Math.min(200, bpm));
    this.generateBeatGrid();
    
    if (this.trackInfo) {
      this.trackInfo.bpm = this.bpm;
    }
  }
  
  // Get current beat position
  getCurrentBeat(): number {
    if (!this.beatGrid.length) return 0;
    
    // Find which beat we're closest to
    for (let i = 0; i < this.beatGrid.length - 1; i++) {
      if (this.currentTime >= this.beatGrid[i] && this.currentTime < this.beatGrid[i + 1]) {
        return i + 1;
      }
    }
    
    return this.beatGrid.length;
  }
  
  // Check if near track end (warning zone)
  isNearTrackEnd(warningSeconds: number = 30): boolean {
    return this.duration - this.currentTime <= warningSeconds;
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
  
  onBeat(callback: (beat: number) => void): void {
    this.onBeatCallback = callback;
  }
  
  onBpmDetected(callback: (bpm: number) => void): void {
    this.onBpmDetectedCallback = callback;
  }
  
  onKeyDetected(callback: (key: KeyInfo) => void): void {
    this.onKeyDetectedCallback = callback;
  }
  
  onAnalysisComplete(callback: () => void): void {
    this.onAnalysisCompleteCallback = callback;
  }
  
  onTrackLoaded(callback: (trackInfo: DJTrackInfo) => void): void {
    this.onTrackLoadedCallback = callback;
  }
  
  onCueChange(callback: (cuePoints: CuePoint[]) => void): void {
    this.onCueChangeCallback = callback;
  }
  
  onLoopChange(callback: (loops: LoopPoint[]) => void): void {
    this.onLoopChangeCallback = callback;
  }
  
  onSyncStateChange(callback: (syncState: SyncState) => void): void {
    this.onSyncStateChangeCallback = callback;
  }
  
  // Get analysis state for UI components
  getAnalysisState(): { isAnalyzing: boolean; keyInfo: KeyInfo | null; beatGrid: number[]; currentBeat: number } {
    return {
      isAnalyzing: this.isAnalyzing,
      keyInfo: this.keyInfo,
      beatGrid: [...this.beatGrid],
      currentBeat: this.currentBeat
    };
  }
  
  // Generate deterministic track ID based on track content for cross-session consistency
  generateTrackId(): string {
    if (!this.trackId && this.trackInfo) {
      // Create deterministic ID based on track metadata
      const trackData = `${this.trackInfo.title}-${this.trackInfo.artist}-${this.trackInfo.duration.toFixed(3)}`;
      // Simple hash function for deterministic IDs
      let hash = 0;
      for (let i = 0; i < trackData.length; i++) {
        const char = trackData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      this.trackId = `track-${Math.abs(hash).toString(16)}`;
    } else if (!this.trackId) {
      // Fallback to UUID if no track info available
      this.trackId = crypto.randomUUID();
    }
    return this.trackId;
  }
  
  // Set track ID from database
  setTrackId(id: string): void {
    this.trackId = id;
  }

  // Private methods for time tracking
  private startTimeTracking(): void {
    this.stopTimeTracking(); // Clear any existing tracking
    
    let lastBeat = -1;
    
    const updateTime = () => {
      if (this.isPlaying && this.audioContext) {
        // Calculate current time accounting for pitch rate
        const elapsedContextTime = this.audioContext.currentTime - this.startTime;
        this.currentTime = this.playbackStartOffset + (elapsedContextTime * this.pitchRate);
        
        // Update current beat and trigger beat callback
        const currentBeat = this.getCurrentBeat();
        if (currentBeat !== lastBeat && currentBeat > 0) {
          this.currentBeat = currentBeat;
          this.onBeatCallback?.(currentBeat);
          lastBeat = currentBeat;
        }
        
        // Professional continuous drift correction for synced decks
        if (this.syncState.isSynced && this.syncState.masterDeck) {
          const currentAudioTime = this.audioContext.currentTime;
          const timeSinceLastSync = currentAudioTime - this.syncState.lastSyncTime;
          
          // Check for drift every 2 seconds to maintain professional sync accuracy
          if (timeSinceLastSync > 2.0) {
            // Find the master deck to sync against
            const masterDeck = djMixer.deckA.id === this.syncState.masterDeck ? djMixer.deckA : djMixer.deckB;
            
            if (masterDeck && masterDeck.isPlaying && this.beatGrid.length > 0 && masterDeck.beatGrid.length > 0) {
              // Calculate current phase drift
              const masterBeatInterval = 60 / (masterDeck.detectedBpm || masterDeck.bpm);
              const thisBeatInterval = 60 / ((this.detectedBpm || this.bpm) * this.pitchRate);
              
              const masterNearestBeat = this.findNearestBeat(masterDeck.currentTime);
              const thisNearestBeat = this.findNearestBeat(this.currentTime);
              
              const masterPhase = (masterDeck.currentTime - masterNearestBeat) / masterBeatInterval;
              const thisPhase = (this.currentTime - thisNearestBeat) / thisBeatInterval;
              
              let phaseDrift = masterPhase - thisPhase;
              if (phaseDrift > 0.5) phaseDrift -= 1.0;
              if (phaseDrift < -0.5) phaseDrift += 1.0;
              
              // Apply micro-correction if drift exceeds professional tolerance
              if (Math.abs(phaseDrift) > 0.02) { // 2% of beat tolerance
                const driftCorrection = phaseDrift * thisBeatInterval * 0.1; // Gentle correction
                this.syncState.driftCorrection += driftCorrection;
                
                // Apply smooth drift correction
                const targetTime = this.currentTime + driftCorrection;
                if (targetTime >= 0 && targetTime <= this.duration) {
                  this.currentTime = targetTime;
                  this.playbackStartOffset = targetTime;
                  this.startTime = currentAudioTime; // Reset reference time
                }
                
                // Update sync accuracy
                this.syncState.syncAccuracy = Math.max(0, 1 - Math.abs(phaseDrift) * 5);
                this.syncState.lastSyncTime = currentAudioTime;
                
                // Fire sync state update for phase meter
                this.onSyncStateChangeCallback?.(this.syncState);
                
                console.log(`${this.id} drift corrected: ${(phaseDrift * 1000).toFixed(2)}ms, accuracy: ${(this.syncState.syncAccuracy * 100).toFixed(1)}%`);
              }
            }
          }
        }
        
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