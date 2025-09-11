/**
 * Advanced Beat Detection and Music Analysis Library
 * Provides professional-grade beat detection, tempo analysis, and musical feature extraction
 */

export interface BeatInfo {
  isBeat: boolean;
  confidence: number;
  bpm: number;
  beatStrength: number;
  timeSignature: number;
  currentBeat: number;
  beatPhase: number; // 0-1, position within current beat
  nextBeatTime: number;
  previousBeatTime: number;
}

export interface SpectralFeatures {
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  totalEnergy: number;
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  harmonicity: number;
  brightness: number;
}

export interface TransientInfo {
  isTransient: boolean;
  strength: number;
  type: 'kick' | 'snare' | 'hihat' | 'crash' | 'general';
  confidence: number;
}

export interface MusicalKey {
  key: string;
  mode: 'major' | 'minor';
  confidence: number;
  camelotKey: string;
}

export class BeatDetector {
  private audioContext: AudioContext;
  private analyserNode: AnalyserNode;
  private frequencyData: Uint8Array;
  private timeDomainData: Uint8Array;
  
  // Beat detection parameters
  private bufferSize: number = 1024;
  private hopSize: number = 512;
  private sampleRate: number = 44100;
  
  // Beat tracking state
  private beatHistory: number[] = [];
  private energyHistory: number[] = [];
  private spectrumHistory: number[][] = [];
  private tempoHypotheses: Map<number, number> = new Map();
  private currentBPM: number = 120;
  private lastBeatTime: number = 0;
  private beatPhase: number = 0;
  private confidence: number = 0;
  
  // Onset detection
  private previousSpectrum: number[] = [];
  private spectralFlux: number[] = [];
  private adaptiveThreshold: number = 0.1;
  private onsetHistory: number[] = [];
  
  // Frequency band analysis
  private bassRange: [number, number] = [0, 250]; // Hz
  private midRange: [number, number] = [250, 4000]; // Hz
  private highRange: [number, number] = [4000, 20000]; // Hz
  
  // Callbacks
  private onBeatCallback?: (beatInfo: BeatInfo) => void;
  private onTransientCallback?: (transientInfo: TransientInfo) => void;
  private onSpectralFeaturesCallback?: (features: SpectralFeatures) => void;
  private onTempoChangeCallback?: (bpm: number) => void;
  
  // Analysis state
  private isAnalyzing: boolean = false;
  private analysisStartTime: number = 0;
  private frameCount: number = 0;

  constructor(audioContext: AudioContext, analyserNode: AnalyserNode) {
    this.audioContext = audioContext;
    this.analyserNode = analyserNode;
    this.sampleRate = audioContext.sampleRate;
    
    // Configure analyser for optimal beat detection
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.3;
    
    this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyserNode.frequencyBinCount);
    
    this.initializeAnalysis();
  }

  private initializeAnalysis(): void {
    // Initialize spectrum history for onset detection
    this.previousSpectrum = new Array(this.analyserNode.frequencyBinCount).fill(0);
    this.spectralFlux = [];
    this.energyHistory = [];
    this.beatHistory = [];
    this.spectrumHistory = [];
    this.onsetHistory = [];
  }

  // Start real-time beat detection
  startDetection(): void {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    this.analysisStartTime = this.audioContext.currentTime;
    this.frameCount = 0;
    
    console.log('Beat detection started');
    this.analyzeFrame();
  }

  // Stop beat detection
  stopDetection(): void {
    this.isAnalyzing = false;
    console.log('Beat detection stopped');
  }

  // Main analysis frame - called continuously during playback
  private analyzeFrame(): void {
    if (!this.isAnalyzing) return;

    // Get current audio data
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    this.analyserNode.getByteTimeDomainData(this.timeDomainData);
    
    const currentTime = this.audioContext.currentTime;
    this.frameCount++;
    
    // Perform analysis
    const spectralFeatures = this.extractSpectralFeatures();
    const onsetStrength = this.detectOnsets(spectralFeatures);
    const beatInfo = this.trackBeats(onsetStrength, currentTime);
    const transientInfo = this.detectTransients(spectralFeatures);
    
    // Update beat phase
    this.updateBeatPhase(currentTime);
    
    // Fire callbacks
    if (this.onSpectralFeaturesCallback) {
      this.onSpectralFeaturesCallback(spectralFeatures);
    }
    
    if (beatInfo.isBeat && this.onBeatCallback) {
      this.onBeatCallback(beatInfo);
    }
    
    if (transientInfo.isTransient && this.onTransientCallback) {
      this.onTransientCallback(transientInfo);
    }
    
    // Continue analysis
    requestAnimationFrame(() => this.analyzeFrame());
  }

  // Extract comprehensive spectral features
  private extractSpectralFeatures(): SpectralFeatures {
    const spectrum = Array.from(this.frequencyData).map(val => val / 255);
    const nyquist = this.sampleRate / 2;
    const binWidth = nyquist / spectrum.length;
    
    // Calculate energy in frequency bands
    const bassEnd = Math.floor(this.bassRange[1] / binWidth);
    const midEnd = Math.floor(this.midRange[1] / binWidth);
    
    const bassEnergy = this.calculateBandEnergy(spectrum, 0, bassEnd);
    const midEnergy = this.calculateBandEnergy(spectrum, bassEnd, midEnd);
    const highEnergy = this.calculateBandEnergy(spectrum, midEnd, spectrum.length);
    const totalEnergy = bassEnergy + midEnergy + highEnergy;
    
    // Spectral centroid (brightness indicator)
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = i * binWidth;
      weightedSum += frequency * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // Spectral rolloff (85% of energy threshold)
    let energySum = 0;
    const rolloffThreshold = totalEnergy * 0.85;
    let rolloffFrequency = 0;
    for (let i = 0; i < spectrum.length; i++) {
      energySum += spectrum[i];
      if (energySum >= rolloffThreshold) {
        rolloffFrequency = i * binWidth;
        break;
      }
    }
    
    // Zero crossing rate (from time domain data)
    let zeroCrossings = 0;
    for (let i = 1; i < this.timeDomainData.length; i++) {
      if ((this.timeDomainData[i] >= 128) !== (this.timeDomainData[i-1] >= 128)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / this.timeDomainData.length;
    
    // Harmonicity estimation (simplified)
    const harmonicity = this.estimateHarmonicity(spectrum);
    
    // Brightness (high frequency content relative to total)
    const brightness = totalEnergy > 0 ? highEnergy / totalEnergy : 0;
    
    return {
      bassEnergy,
      midEnergy,
      highEnergy,
      totalEnergy,
      spectralCentroid,
      spectralRolloff: rolloffFrequency,
      zeroCrossingRate,
      harmonicity,
      brightness
    };
  }

  private calculateBandEnergy(spectrum: number[], startBin: number, endBin: number): number {
    let energy = 0;
    for (let i = startBin; i < Math.min(endBin, spectrum.length); i++) {
      energy += spectrum[i] * spectrum[i];
    }
    return Math.sqrt(energy);
  }

  private estimateHarmonicity(spectrum: number[]): number {
    // Simple harmonicity estimation based on harmonic series strength
    let harmonicStrength = 0;
    let totalStrength = 0;
    
    // Check for harmonic peaks (simplified)
    for (let fundamental = 2; fundamental < 50; fundamental++) {
      let harmonicSum = 0;
      for (let harmonic = 1; harmonic <= 8; harmonic++) {
        const bin = Math.floor(fundamental * harmonic);
        if (bin < spectrum.length) {
          harmonicSum += spectrum[bin];
        }
      }
      harmonicStrength += harmonicSum;
      totalStrength += spectrum.slice(fundamental, Math.min(fundamental + 50, spectrum.length))
                              .reduce((a, b) => a + b, 0);
    }
    
    return totalStrength > 0 ? harmonicStrength / totalStrength : 0;
  }

  // Advanced onset detection using spectral flux
  private detectOnsets(features: SpectralFeatures): number {
    const spectrum = Array.from(this.frequencyData).map(val => val / 255);
    
    // Calculate spectral flux (difference between consecutive spectra)
    let flux = 0;
    for (let i = 0; i < spectrum.length; i++) {
      const diff = spectrum[i] - this.previousSpectrum[i];
      flux += diff > 0 ? diff : 0; // Half-wave rectification
    }
    
    // Store spectrum for next frame
    this.previousSpectrum = [...spectrum];
    
    // Add to history
    this.spectralFlux.push(flux);
    if (this.spectralFlux.length > 200) {
      this.spectralFlux.shift();
    }
    
    // Adaptive threshold using local statistics
    if (this.spectralFlux.length >= 10) {
      const recentFlux = this.spectralFlux.slice(-10);
      const mean = recentFlux.reduce((a, b) => a + b) / recentFlux.length;
      const variance = recentFlux.reduce((a, b) => a + (b - mean) ** 2, 0) / recentFlux.length;
      this.adaptiveThreshold = mean + Math.sqrt(variance) * 2;
    }
    
    return flux;
  }

  // Advanced beat tracking with tempo estimation
  private trackBeats(onsetStrength: number, currentTime: number): BeatInfo {
    const isOnset = onsetStrength > this.adaptiveThreshold;
    
    if (isOnset) {
      this.onsetHistory.push(currentTime);
      if (this.onsetHistory.length > 100) {
        this.onsetHistory.shift();
      }
    }
    
    // Update tempo estimates
    this.updateTempoEstimates();
    
    // Determine if this is a beat
    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const expectedBeatInterval = 60 / this.currentBPM;
    const beatTolerance = expectedBeatInterval * 0.2; // 20% tolerance
    
    let isBeat = false;
    let beatStrength = 0;
    let confidence = this.confidence;
    
    if (isOnset && (timeSinceLastBeat >= (expectedBeatInterval - beatTolerance))) {
      // This could be a beat
      beatStrength = Math.min(onsetStrength / this.adaptiveThreshold, 2.0);
      
      // Check if timing matches expected beat
      const timingError = Math.abs(timeSinceLastBeat - expectedBeatInterval);
      const timingAccuracy = 1.0 - (timingError / expectedBeatInterval);
      
      if (timingAccuracy > 0.7) { // 70% timing accuracy threshold
        isBeat = true;
        this.lastBeatTime = currentTime;
        this.beatHistory.push(currentTime);
        
        if (this.beatHistory.length > 8) {
          this.beatHistory.shift();
        }
        
        // Update confidence
        this.confidence = Math.min(this.confidence + 0.1, 1.0);
      }
    }
    
    // Calculate beat phase and predictions
    const nextBeatTime = this.lastBeatTime + expectedBeatInterval;
    const previousBeatTime = this.lastBeatTime;
    const currentBeat = Math.floor((currentTime - this.analysisStartTime) / expectedBeatInterval) + 1;
    
    return {
      isBeat,
      confidence,
      bpm: this.currentBPM,
      beatStrength,
      timeSignature: 4, // Assume 4/4 for now
      currentBeat,
      beatPhase: this.beatPhase,
      nextBeatTime,
      previousBeatTime
    };
  }

  private updateTempoEstimates(): void {
    if (this.onsetHistory.length < 4) return;
    
    // Analyze recent onsets for tempo
    const recentOnsets = this.onsetHistory.slice(-8);
    const intervals: number[] = [];
    
    for (let i = 1; i < recentOnsets.length; i++) {
      intervals.push(recentOnsets[i] - recentOnsets[i-1]);
    }
    
    // Look for consistent intervals (potential beat periods)
    intervals.forEach(interval => {
      const bpm = 60 / interval;
      if (bpm >= 60 && bpm <= 200) {
        // Quantize to reasonable BPM values
        const quantizedBPM = Math.round(bpm);
        const count = this.tempoHypotheses.get(quantizedBPM) || 0;
        this.tempoHypotheses.set(quantizedBPM, count + 1);
      }
    });
    
    // Find most confident tempo hypothesis
    let maxCount = 0;
    let bestBPM = this.currentBPM;
    
    for (const [bpm, count] of this.tempoHypotheses) {
      if (count > maxCount) {
        maxCount = count;
        bestBPM = bpm;
      }
    }
    
    // Update current BPM if we have strong evidence
    if (maxCount >= 3 && Math.abs(bestBPM - this.currentBPM) > 2) {
      const oldBPM = this.currentBPM;
      this.currentBPM = bestBPM;
      
      if (this.onTempoChangeCallback) {
        this.onTempoChangeCallback(this.currentBPM);
      }
      
      console.log(`Tempo updated: ${oldBPM} → ${this.currentBPM} BPM`);
    }
    
    // Decay old hypotheses
    if (this.frameCount % 100 === 0) {
      for (const [bpm, count] of this.tempoHypotheses) {
        if (count > 1) {
          this.tempoHypotheses.set(bpm, count - 1);
        } else {
          this.tempoHypotheses.delete(bpm);
        }
      }
    }
  }

  private updateBeatPhase(currentTime: number): void {
    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const beatInterval = 60 / this.currentBPM;
    this.beatPhase = (timeSinceLastBeat / beatInterval) % 1.0;
  }

  // Detect different types of transients (kick, snare, hi-hat, etc.)
  private detectTransients(features: SpectralFeatures): TransientInfo {
    const { bassEnergy, midEnergy, highEnergy, totalEnergy, zeroCrossingRate, brightness } = features;
    
    let type: TransientInfo['type'] = 'general';
    let strength = 0;
    let confidence = 0;
    let isTransient = false;
    
    // Kick drum detection (high bass energy, low brightness)
    if (bassEnergy > 0.7 && brightness < 0.3 && totalEnergy > 0.5) {
      type = 'kick';
      strength = bassEnergy;
      confidence = (1 - brightness) * bassEnergy;
      isTransient = true;
    }
    // Snare detection (mid energy spike with some high frequencies)
    else if (midEnergy > 0.6 && brightness > 0.4 && brightness < 0.8) {
      type = 'snare';
      strength = midEnergy;
      confidence = midEnergy * brightness;
      isTransient = true;
    }
    // Hi-hat detection (high frequency content, high zero crossing rate)
    else if (highEnergy > 0.5 && brightness > 0.7 && zeroCrossingRate > 0.1) {
      type = 'hihat';
      strength = highEnergy;
      confidence = brightness * zeroCrossingRate * 10;
      isTransient = true;
    }
    // Crash cymbal (very high frequency content and energy)
    else if (highEnergy > 0.8 && brightness > 0.8 && totalEnergy > 0.6) {
      type = 'crash';
      strength = highEnergy;
      confidence = brightness * totalEnergy;
      isTransient = true;
    }
    // General transient (significant energy increase)
    else if (totalEnergy > 0.6) {
      type = 'general';
      strength = totalEnergy;
      confidence = totalEnergy * 0.5;
      isTransient = true;
    }
    
    return {
      isTransient,
      strength: Math.min(strength, 1.0),
      type,
      confidence: Math.min(confidence, 1.0)
    };
  }

  // Event handler registration
  onBeat(callback: (beatInfo: BeatInfo) => void): void {
    this.onBeatCallback = callback;
  }

  onTransient(callback: (transientInfo: TransientInfo) => void): void {
    this.onTransientCallback = callback;
  }

  onSpectralFeatures(callback: (features: SpectralFeatures) => void): void {
    this.onSpectralFeaturesCallback = callback;
  }

  onTempoChange(callback: (bpm: number) => void): void {
    this.onTempoChangeCallback = callback;
  }

  // Public getters
  getCurrentBPM(): number {
    return this.currentBPM;
  }

  getConfidence(): number {
    return this.confidence;
  }

  getBeatPhase(): number {
    return this.beatPhase;
  }

  getLastBeatTime(): number {
    return this.lastBeatTime;
  }

  // Manual BPM override
  setBPM(bpm: number): void {
    if (bpm >= 60 && bpm <= 200) {
      this.currentBPM = bpm;
      this.tempoHypotheses.clear();
      this.tempoHypotheses.set(bpm, 10); // High confidence for manual setting
      console.log(`BPM manually set to ${bpm}`);
    }
  }

  // Reset analysis state
  reset(): void {
    this.beatHistory = [];
    this.energyHistory = [];
    this.spectrumHistory = [];
    this.tempoHypotheses.clear();
    this.onsetHistory = [];
    this.spectralFlux = [];
    this.lastBeatTime = 0;
    this.beatPhase = 0;
    this.confidence = 0;
    this.frameCount = 0;
    
    console.log('Beat detector reset');
  }

  // Get analysis statistics
  getAnalysisStats(): {
    frameCount: number;
    analysisTime: number;
    tempoHypotheses: Map<number, number>;
    confidence: number;
    beatCount: number;
  } {
    return {
      frameCount: this.frameCount,
      analysisTime: this.audioContext.currentTime - this.analysisStartTime,
      tempoHypotheses: new Map(this.tempoHypotheses),
      confidence: this.confidence,
      beatCount: this.beatHistory.length
    };
  }
}

// Utility functions for musical analysis
export const MusicalAnalysisUtils = {
  // Convert BPM to beat interval in seconds
  bpmToInterval: (bpm: number): number => 60 / bpm,
  
  // Convert beat interval to BPM
  intervalToBPM: (interval: number): number => 60 / interval,
  
  // Quantize BPM to common musical tempos
  quantizeBPM: (bpm: number): number => {
    const commonTempos = [60, 70, 80, 90, 100, 110, 120, 128, 130, 140, 150, 160, 170, 175, 180];
    return commonTempos.reduce((prev, curr) => 
      Math.abs(curr - bpm) < Math.abs(prev - bpm) ? curr : prev
    );
  },
  
  // Calculate swing ratio (8th note timing variation)
  calculateSwing: (beatTimes: number[]): number => {
    if (beatTimes.length < 4) return 0.5; // No swing detectable
    
    // Analyze subdivision timing for swing detection
    // This is a simplified implementation
    return 0.5; // Return neutral for now
  },
  
  // Detect time signature (4/4, 3/4, etc.)
  detectTimeSignature: (beatTimes: number[]): number => {
    if (beatTimes.length < 8) return 4; // Default to 4/4
    
    // Analyze beat groupings and strong/weak beat patterns
    // This is a simplified implementation that assumes 4/4
    return 4;
  }
};