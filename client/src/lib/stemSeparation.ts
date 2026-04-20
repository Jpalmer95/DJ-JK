/**
 * Stem Separation Engine for DJ-JK
 *
 * Provides real-time stem separation using Web Audio API frequency band isolation.
 * True ML-based separation (demucs/spleeter) requires a server, so this implements
 * a high-quality spectral gating approach that works entirely in the browser.
 */

import { initAudioContext } from './audio';

// ========== Types ==========

export type StemType = 'vocals' | 'drums' | 'bass' | 'melody' | 'other';

export interface StemTrack {
  id: string;
  type: StemType;
  audioBuffer: AudioBuffer;
  volume: number;
  muted: boolean;
  solo: boolean;
}

export interface SeparatedStems {
  vocals: AudioBuffer;
  drums: AudioBuffer;
  bass: AudioBuffer;
  melody: AudioBuffer;
  other: AudioBuffer;
}

export interface StemSeparationProgress {
  phase: 'analyzing' | 'extracting' | 'processing' | 'complete';
  progress: number; // 0-100
  currentStem?: StemType;
}

// ========== Utility Functions ==========

/**
 * Get stem colors for UI rendering
 */
export function getStemColor(type: StemType): string {
  const colors: Record<StemType, string> = {
    vocals: '#ff00ff',   // Magenta
    drums: '#ff4400',    // Orange-red
    bass: '#00ff88',     // Green
    melody: '#00aaff',   // Cyan
    other: '#ffaa00',    // Amber
  };
  return colors[type];
}

/**
 * Get stem icon names (lucide-react icons)
 */
export function getStemIcon(type: StemType): string {
  const icons: Record<StemType, string> = {
    vocals: 'Mic',
    drums: 'Disc3',
    bass: 'Music',
    melody: 'AudioLines',
    other: 'Layers',
  };
  return icons[type];
}

/**
 * Get ordered list of stem types
 */
export function getStemTypes(): StemType[] {
  return ['vocals', 'drums', 'bass', 'melody', 'other'];
}

/**
 * Generate waveform data for visualization from an AudioBuffer
 */
export function getStemWaveformData(buffer: AudioBuffer, resolution: number = 256): number[] {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / resolution);
  const waveform = new Array(resolution);

  for (let i = 0; i < resolution; i++) {
    let sum = 0;
    const start = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j] || 0);
    }
    waveform[i] = sum / blockSize;
  }

  return waveform;
}

/**
 * Export a single stem as a WAV Blob
 */
export function downloadStem(type: StemType, buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format chunk size
  view.setUint16(20, 1, true);  // Audio format: PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write PCM data
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = headerSize;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Create a combined AudioBuffer from multiple stems with individual volumes
 */
export function mixStems(
  stems: Partial<Record<StemType, { buffer: AudioBuffer; volume: number; muted: boolean; solo: boolean }>>,
  soloActive: boolean
): AudioBuffer | null {
  const audioContext = initAudioContext();
  if (!audioContext) return null;

  const stemTypes = getStemTypes();
  let sampleRate = 0;
  let length = 0;
  let numChannels = 0;

  // Find the first valid stem to get buffer parameters
  for (const type of stemTypes) {
    const stem = stems[type];
    if (stem?.buffer) {
      sampleRate = stem.buffer.sampleRate;
      length = stem.buffer.length;
      numChannels = stem.buffer.numberOfChannels;
      break;
    }
  }

  if (!sampleRate || !length) return null;

  const mixed = audioContext.createBuffer(numChannels, length, sampleRate);
  const output: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    output.push(mixed.getChannelData(ch));
  }

  for (const type of stemTypes) {
    const stem = stems[type];
    if (!stem || stem.muted) continue;
    if (soloActive && !stem.solo) continue;

    const vol = stem.volume;
    for (let ch = 0; ch < numChannels; ch++) {
      if (ch >= stem.buffer.numberOfChannels) continue;
      const input = stem.buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        output[ch][i] += (input[i] || 0) * vol;
      }
    }
  }

  // Normalize to prevent clipping
  let peak = 0;
  for (let ch = 0; ch < numChannels; ch++) {
    for (let i = 0; i < length; i++) {
      peak = Math.max(peak, Math.abs(output[ch][i]));
    }
  }
  if (peak > 1.0) {
    const scale = 1.0 / peak;
    for (let ch = 0; ch < numChannels; ch++) {
      for (let i = 0; i < length; i++) {
        output[ch][i] *= scale;
      }
    }
  }

  return mixed;
}

// ========== StemSeparator Class ==========

export class StemSeparator {
  private onProgress?: (progress: StemSeparationProgress) => void;

  constructor(onProgress?: (progress: StemSeparationProgress) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Separate an AudioBuffer into 5 stems using frequency-domain filtering.
   * Uses a combination of band-pass filtering, mid/side processing, and
   * frequency band isolation for reasonable stem extraction in the browser.
   */
  async separateStems(inputBuffer: AudioBuffer): Promise<SeparatedStems> {
    const audioContext = initAudioContext();
    if (!audioContext) throw new Error('AudioContext not initialized');

    this.reportProgress('analyzing', 0);

    const { sampleRate, numberOfChannels, length } = inputBuffer;
    const duration = length / sampleRate;

    this.reportProgress('extracting', 10, 'bass');

    // --- Bass: Low-pass at 250Hz ---
    const bassBuffer = await this.processWithFilters(inputBuffer, [
      { type: 'lowpass', frequency: 250, Q: 0.707, gain: 0 }
    ]);

    this.reportProgress('extracting', 25, 'drums');

    // --- Drums: Band-pass 250-8000Hz with transient emphasis ---
    // Use a wider band for percussion isolation
    const drumsBuffer = await this.processDrumsSeparation(inputBuffer, sampleRate, length, numberOfChannels);

    this.reportProgress('extracting', 45, 'vocals');

    // --- Vocals: Mid-channel extraction in vocal range ---
    // Vocals are typically center-panned and in 300-3500Hz
    const vocalsBuffer = await this.processVocalsSeparation(inputBuffer, sampleRate, length, numberOfChannels);

    this.reportProgress('extracting', 65, 'melody');

    // --- Melody: Band-pass 250-5000Hz minus vocal range ---
    const melodyBuffer = await this.processWithFilters(inputBuffer, [
      { type: 'bandpass', frequency: 1200, Q: 0.5, gain: 0 }
    ]);
    // Subtract vocals and bass from melody
    this.subtractBuffers(melodyBuffer, vocalsBuffer, 0.6);
    this.subtractBuffers(melodyBuffer, bassBuffer, 0.8);

    this.reportProgress('extracting', 85, 'other');

    // --- Other: Everything minus the other stems ---
    const otherBuffer = this.cloneBuffer(inputBuffer);
    this.subtractBuffers(otherBuffer, bassBuffer, 0.9);
    this.subtractBuffers(otherBuffer, drumsBuffer, 0.6);
    this.subtractBuffers(otherBuffer, vocalsBuffer, 0.8);
    this.subtractBuffers(otherBuffer, melodyBuffer, 0.5);

    this.reportProgress('processing', 95);

    // Apply post-processing gain normalization
    this.normalizeBuffer(bassBuffer, 1.2);
    this.normalizeBuffer(drumsBuffer, 1.0);
    this.normalizeBuffer(vocalsBuffer, 1.3);
    this.normalizeBuffer(melodyBuffer, 0.8);
    this.normalizeBuffer(otherBuffer, 0.7);

    this.reportProgress('complete', 100);

    return {
      vocals: vocalsBuffer,
      drums: drumsBuffer,
      bass: bassBuffer,
      melody: melodyBuffer,
      other: otherBuffer,
    };
  }

  /**
   * Process audio through a chain of BiquadFilterNodes using OfflineAudioContext
   */
  private async processWithFilters(
    inputBuffer: AudioBuffer,
    filters: { type: BiquadFilterType; frequency: number; Q: number; gain: number }[]
  ): Promise<AudioBuffer> {
    const { sampleRate, numberOfChannels, length } = inputBuffer;
    const offlineCtx = new OfflineAudioContext(numberOfChannels, length, sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = inputBuffer;

    let lastNode: AudioNode = source;
    for (const f of filters) {
      const filter = offlineCtx.createBiquadFilter();
      filter.type = f.type;
      filter.frequency.value = f.frequency;
      filter.Q.value = f.Q;
      if (f.type === 'lowshelf' || f.type === 'highshelf' || f.type === 'peaking') {
        filter.gain.value = f.gain;
      }
      lastNode.connect(filter);
      lastNode = filter;
    }

    lastNode.connect(offlineCtx.destination);
    source.start(0);
    return offlineCtx.startRendering();
  }

  /**
   * Separate drums using transient detection and frequency band isolation
   */
  private async processDrumsSeparation(
    inputBuffer: AudioBuffer,
    sampleRate: number,
    length: number,
    numberOfChannels: number
  ): Promise<AudioBuffer> {
    // First pass: band-pass filter for percussion range (200-8000Hz)
    const bandpassCtx = new OfflineAudioContext(numberOfChannels, length, sampleRate);
    const bpSource = bandpassCtx.createBufferSource();
    bpSource.buffer = inputBuffer;

    // Low-pass for upper frequency limit
    const lpFilter = bandpassCtx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 8000;
    lpFilter.Q.value = 0.707;

    // High-pass for lower frequency limit
    const hpFilter = bandpassCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 200;
    hpFilter.Q.value = 0.707;

    bpSource.connect(lpFilter);
    lpFilter.connect(hpFilter);
    hpFilter.connect(bandpassCtx.destination);
    bpSource.start(0);
    const bandpassed = await bandpassCtx.startRendering();

    // Second pass: enhance transients by emphasizing short bursts
    // Apply a slight compression-like effect via gain envelope
    const result = this.cloneBuffer(bandpassed);

    // Transient emphasis: detect rapid amplitude changes
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const data = result.getChannelData(ch);
      const windowSize = Math.floor(sampleRate * 0.005); // 5ms window
      const envelope = new Float32Array(data.length);

      // Compute short-time energy envelope
      for (let i = 0; i < data.length; i++) {
        let energy = 0;
        const start = Math.max(0, i - windowSize);
        for (let j = start; j <= i; j++) {
          energy += data[j] * data[j];
        }
        envelope[i] = Math.sqrt(energy / (i - start + 1));
      }

      // Enhance transient regions
      for (let i = 1; i < data.length; i++) {
        const delta = envelope[i] - envelope[i - 1];
        if (delta > 0.01) {
          // Transient detected - boost slightly
          data[i] *= 1.0 + Math.min(delta * 5, 0.5);
        }
      }
    }

    return result;
  }

  /**
   * Separate vocals using mid-channel extraction
   * Vocals are typically center-panned, so we extract the mid channel
   * and filter to vocal frequency range
   */
  private async processVocalsSeparation(
    inputBuffer: AudioBuffer,
    sampleRate: number,
    length: number,
    numberOfChannels: number
  ): Promise<AudioBuffer> {
    if (numberOfChannels < 2) {
      // Mono input - just bandpass filter to vocal range
      return this.processWithFilters(inputBuffer, [
        { type: 'bandpass', frequency: 1000, Q: 0.7, gain: 0 }
      ]);
    }

    // Stereo input: extract mid channel (L+R)/2
    const offlineCtx = new OfflineAudioContext(numberOfChannels, length, sampleRate);

    const leftSource = offlineCtx.createBufferSource();
    leftSource.buffer = inputBuffer;

    const rightSource = offlineCtx.createBufferSource();
    rightSource.buffer = inputBuffer;

    // Create a channel merger to get mid = (L + R) / 2
    // We'll do this by splitting to mono and mixing
    const splitter = offlineCtx.createChannelSplitter(2);
    const merger = offlineCtx.createChannelMerger(2);
    const gainL = offlineCtx.createGain();
    const gainR = offlineCtx.createGain();
    gainL.gain.value = 0.5;
    gainR.gain.value = 0.5;

    const midGain = offlineCtx.createGain();
    midGain.gain.value = 1.0;

    // Bandpass for vocal range (300-3500Hz)
    const bpFilter = offlineCtx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.value = 1000; // Center of vocal range
    bpFilter.Q.value = 0.5;

    // Low-pass to cut above vocal range
    const lpFilter = offlineCtx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 3500;
    lpFilter.Q.value = 0.707;

    // High-pass to cut below vocal range
    const hpFilter = offlineCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 300;
    hpFilter.Q.value = 0.707;

    // Connect: source -> splitter -> (L+R)/2 -> bandpass -> output
    leftSource.connect(splitter);
    splitter.connect(gainL, 0);
    splitter.connect(gainR, 1);
    gainL.connect(midGain);
    gainR.connect(midGain);
    midGain.connect(bpFilter);
    bpFilter.connect(lpFilter);
    lpFilter.connect(hpFilter);
    hpFilter.connect(offlineCtx.destination);

    leftSource.start(0);
    return offlineCtx.startRendering();
  }

  /**
   * Subtract one buffer from another (in-place on target)
   */
  private subtractBuffers(target: AudioBuffer, source: AudioBuffer, amount: number): void {
    const channels = Math.min(target.numberOfChannels, source.numberOfChannels);
    for (let ch = 0; ch < channels; ch++) {
      const targetData = target.getChannelData(ch);
      const sourceData = source.getChannelData(ch);
      for (let i = 0; i < targetData.length; i++) {
        targetData[i] -= (sourceData[i] || 0) * amount;
      }
    }
  }

  /**
   * Clone an AudioBuffer
   */
  private cloneBuffer(source: AudioBuffer): AudioBuffer {
    const audioContext = initAudioContext();
    if (!audioContext) throw new Error('AudioContext not initialized');

    const clone = audioContext.createBuffer(
      source.numberOfChannels,
      source.length,
      source.sampleRate
    );
    for (let ch = 0; ch < source.numberOfChannels; ch++) {
      clone.copyToChannel(source.getChannelData(ch).slice(), ch);
    }
    return clone;
  }

  /**
   * Normalize buffer to a target peak amplitude
   */
  private normalizeBuffer(buffer: AudioBuffer, targetPeak: number): void {
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
      }
    }
    if (peak > 0 && peak !== targetPeak) {
      const scale = targetPeak / peak;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          data[i] *= scale;
        }
      }
    }
  }

  private reportProgress(
    phase: StemSeparationProgress['phase'],
    progress: number,
    currentStem?: StemType
  ): void {
    this.onProgress?.({ phase, progress, currentStem });
  }
}

// ========== StemPlayer Class ==========

export class StemPlayer {
  private audioContext: AudioContext | null = null;
  private stems: Map<StemType, StemTrack> = new Map();
  private sources: Map<StemType, AudioBufferSourceNode> = new Map();
  private gains: Map<StemType, GainNode> = new Map();
  private masterGain: GainNode | null = null;
  private outputNode: AudioNode | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;

  constructor() {
    this.audioContext = initAudioContext();
  }

  /**
   * Load separated stems into the player
   */
  loadStems(separatedStems: SeparatedStems): void {
    this.stop();
    this.stems.clear();

    const types: StemType[] = ['vocals', 'drums', 'bass', 'melody', 'other'];
    for (const type of types) {
      this.stems.set(type, {
        id: `stem-${type}-${Date.now()}`,
        type,
        audioBuffer: separatedStems[type],
        volume: 1.0,
        muted: false,
        solo: false,
      });
    }
  }

  /**
   * Play all stems in sync
   */
  play(): void {
    if (this.isPlaying || !this.audioContext) return;

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 1.0;

    if (this.outputNode) {
      this.masterGain.connect(this.outputNode);
    }

    this.sources.clear();
    this.gains.clear();

    for (const [type, stem] of this.stems) {
      const source = this.audioContext.createBufferSource();
      source.buffer = stem.audioBuffer;

      const gain = this.audioContext.createGain();
      gain.gain.value = stem.muted ? 0 : stem.volume;

      source.connect(gain);
      gain.connect(this.masterGain!);

      this.sources.set(type, source);
      this.gains.set(type, gain);

      const offset = this.pauseOffset;
      const duration = stem.audioBuffer.duration - offset;
      if (duration > 0) {
        source.start(0, offset);
      }
    }

    this.startTime = this.audioContext.currentTime - this.pauseOffset;
    this.isPlaying = true;
  }

  /**
   * Stop all stems
   */
  stop(): void {
    if (!this.isPlaying) {
      this.pauseOffset = 0;
      return;
    }

    if (this.audioContext) {
      this.pauseOffset = this.audioContext.currentTime - this.startTime;
    }

    for (const [, source] of this.sources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    this.sources.clear();
    this.gains.clear();

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    this.isPlaying = false;
  }

  /**
   * Set volume for a specific stem (0.0 to 1.0)
   */
  setStemVolume(type: StemType, volume: number): void {
    const stem = this.stems.get(type);
    if (stem) {
      stem.volume = Math.max(0, Math.min(1, volume));
      const gain = this.gains.get(type);
      if (gain && !stem.muted) {
        gain.gain.setValueAtTime(stem.volume, this.audioContext!.currentTime);
      }
    }
  }

  /**
   * Mute/unmute a specific stem
   */
  muteStem(type: StemType, muted: boolean): void {
    const stem = this.stems.get(type);
    if (stem) {
      stem.muted = muted;
      const gain = this.gains.get(type);
      if (gain) {
        gain.gain.setValueAtTime(muted ? 0 : stem.volume, this.audioContext!.currentTime);
      }
    }
  }

  /**
   * Solo a stem (only play this stem when solo is active)
   */
  soloStem(type: StemType, solo: boolean): void {
    const stem = this.stems.get(type);
    if (stem) {
      stem.solo = solo;
    }

    // Check if any stem is soloed
    let anySolo = false;
    for (const [, s] of this.stems) {
      if (s.solo) { anySolo = true; break; }
    }

    // Update gains based on solo state
    for (const [t, s] of this.stems) {
      const gain = this.gains.get(t);
      if (gain) {
        if (anySolo) {
          gain.gain.setValueAtTime(s.solo && !s.muted ? s.volume : 0, this.audioContext!.currentTime);
        } else {
          gain.gain.setValueAtTime(s.muted ? 0 : s.volume, this.audioContext!.currentTime);
        }
      }
    }
  }

  /**
   * Connect output to a destination node
   */
  connectTo(destination: AudioNode): void {
    this.outputNode = destination;
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain.connect(destination);
    }
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext!.currentTime
      );
    }
  }

  /**
   * Set playback rate (pitch/speed) for all stems
   */
  setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.25, Math.min(4.0, rate));
    for (const [, source] of this.sources) {
      source.playbackRate.setValueAtTime(clamped, this.audioContext!.currentTime);
    }
  }

  /**
   * Get all stem tracks
   */
  getStems(): Map<StemType, StemTrack> {
    return new Map(this.stems);
  }

  /**
   * Get a specific stem track
   */
  getStem(type: StemType): StemTrack | undefined {
    return this.stems.get(type);
  }

  /**
   * Check if stems are loaded
   */
  hasStems(): boolean {
    return this.stems.size > 0;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get the duration of the longest stem
   */
  getDuration(): number {
    let max = 0;
    for (const [, stem] of this.stems) {
      max = Math.max(max, stem.audioBuffer.duration);
    }
    return max;
  }

  /**
   * Seek to a position in seconds
   */
  seek(time: number): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }
    this.pauseOffset = Math.max(0, Math.min(time, this.getDuration()));
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.isPlaying || !this.audioContext) return this.pauseOffset;
    return this.audioContext.currentTime - this.startTime;
  }

  /**
   * Check if any stem is soloed
   */
  isAnySolo(): boolean {
    for (const [, stem] of this.stems) {
      if (stem.solo) return true;
    }
    return false;
  }

  /**
   * Cleanup and disconnect
   */
  dispose(): void {
    this.stop();
    if (this.outputNode && this.masterGain) {
      this.masterGain.disconnect();
    }
    this.stems.clear();
    this.outputNode = null;
  }
}
