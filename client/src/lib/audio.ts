import { Howl } from "howler";

// Define frequencies for different piano notes
const NOTE_FREQUENCIES: Record<string, number> = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
};

// Sound mode types
export type SoundMode = 'piano' | 'synth' | 'chiptune' | 'funk';

// Beat patterns - time in ms between kick and snare
export const BEATS = {
  'none': [],
  'basic': [0, 400, 800, 1200], // Simple 4/4 beat
  'groove': [0, 400, 600, 1000, 1200], // Syncopated beat
  'electro': [0, 200, 400, 600, 800, 1000, 1200, 1400], // Fast electronic beat
};

export type BeatPattern = keyof typeof BEATS;

// Audio context for WebAudio API
let audioContext: AudioContext | null = null;
let beatIntervalId: NodeJS.Timeout | null = null;
let currentBeatPattern: BeatPattern = 'none';

// For sharing and exporting recordings
export interface RecordedSequence {
  notes: { noteIndex: number; time: number }[];
  soundMode: SoundMode;
  beatPattern: BeatPattern;
}

// Initialize audio context (must be done on user interaction)
export function initAudioContext() {
  if (audioContext) return audioContext;
  
  audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Resume AudioContext if suspended (iOS Safari)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  return audioContext;
}

// Play a note using WebAudio API with different instrument sounds
export function playNote(note: string, volume: number = 0.8, soundMode: SoundMode = 'piano') {
  if (!audioContext) {
    audioContext = initAudioContext();
  }
  
  const frequency = NOTE_FREQUENCIES[note] || 440;
  
  // Create oscillator and gain nodes
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Additional effects for synth mode
  let filterNode: BiquadFilterNode | null = null;
  let distortionNode: WaveShaperNode | null = null;
  
  // Configure oscillator based on the selected sound mode
  switch (soundMode) {
    case 'piano':
      oscillator.type = 'sine';
      // Apply envelope for a piano-like sound
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(volume * 0.7, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
      break;
    
    case 'synth':
      oscillator.type = 'sawtooth';
      
      // Add filter for synth sound
      filterNode = audioContext.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 1500;
      filterNode.Q.value = 5;
      
      // Apply envelope for a synth-like sound
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.2);
      
      // LFO for filter - giving it movement
      const lfo = audioContext.createOscillator();
      lfo.frequency.value = 5; // 5Hz modulation
      const lfoGain = audioContext.createGain();
      lfoGain.gain.value = 200;
      lfo.connect(lfoGain);
      lfoGain.connect(filterNode.frequency);
      lfo.start();
      setTimeout(() => lfo.stop(), 1200);
      break;
    
    case 'chiptune':
      oscillator.type = 'square';
      
      // Apply envelope for a chiptune-like sound
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      // Quick pitch bend for that retro feel
      oscillator.frequency.setValueAtTime(frequency * 1.05, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, audioContext.currentTime + 0.05);
      break;
    
    case 'funk':
      oscillator.type = 'triangle';
      
      // Add distortion for funkiness
      distortionNode = audioContext.createWaveShaper();
      distortionNode.curve = createDistortionCurve(50);
      
      // Apply envelope for a funky sound
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(volume * 0.5, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(volume * 0.8, audioContext.currentTime + 0.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
      break;
  }
  
  // Set the oscillator frequency
  oscillator.frequency.value = frequency;
  
  // Connect nodes based on instrument type
  if (soundMode === 'synth' && filterNode) {
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
  } else if (soundMode === 'funk' && distortionNode) {
    oscillator.connect(distortionNode);
    distortionNode.connect(gainNode);
  } else {
    oscillator.connect(gainNode);
  }
  
  gainNode.connect(audioContext.destination);
  
  // Start and stop oscillator
  oscillator.start();
  const duration = soundMode === 'chiptune' ? 0.3 : soundMode === 'funk' ? 0.8 : 1.5;
  oscillator.stop(audioContext.currentTime + duration);
  
  return oscillator;
}

// Create a distortion curve for funk mode
function createDistortionCurve(amount: number) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  
  for (let i = 0; i < samples; ++i) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  
  return curve;
}

// Function to play drum sounds
function playDrum(type: 'kick' | 'snare' | 'hihat', volume: number = 0.7) {
  if (!audioContext) {
    audioContext = initAudioContext();
  }
  
  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;
  
  if (type === 'kick') {
    // Kick drum
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
    
    // Volume envelope
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } else if (type === 'snare') {
    // Snare drum (noise + tone)
    // Noise component
    const bufferSize = audioContext.sampleRate * 0.2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    // Filter for noise
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    
    // Oscillator for tone
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 180;
    
    // Envelope for both components
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
    
    // Connect everything
    noise.connect(filter);
    filter.connect(gainNode);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start and stop
    noise.start(audioContext.currentTime);
    oscillator.start(audioContext.currentTime);
    noise.stop(audioContext.currentTime + 0.2);
    oscillator.stop(audioContext.currentTime + 0.2);
  } else if (type === 'hihat') {
    // Hi-hat (filtered noise)
    const bufferSize = audioContext.sampleRate * 0.1;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    // Filter for hi-hat
    const filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    
    // Envelope
    gainNode.gain.setValueAtTime(volume * 0.7, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    
    // Connect
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start and stop
    noise.start(audioContext.currentTime);
    noise.stop(audioContext.currentTime + 0.1);
  }
}

// Start a background beat
export function startBeat(pattern: BeatPattern, volume: number = 0.7) {
  stopBeat(); // Stop any existing beat
  
  if (pattern === 'none') return;
  
  currentBeatPattern = pattern;
  let step = 0;
  const beatTiming = BEATS[pattern];
  const cycleDuration = 1600; // ms for a full beat cycle
  
  const playStep = () => {
    if (step % 4 === 0) {
      playDrum('kick', volume);
    }
    if (step % 4 === 2) {
      playDrum('snare', volume);
    }
    if (step % 2 === 1) {
      playDrum('hihat', volume * 0.6);
    }
    step = (step + 1) % 8;
  };
  
  // Start the beat
  playStep(); // Play immediately
  beatIntervalId = setInterval(playStep, cycleDuration / 8);
  
  return () => {
    if (beatIntervalId) {
      clearInterval(beatIntervalId);
      beatIntervalId = null;
    }
  };
}

// Stop the current beat
export function stopBeat() {
  if (beatIntervalId) {
    clearInterval(beatIntervalId);
    beatIntervalId = null;
    currentBeatPattern = 'none';
  }
}

// Get current beat pattern
export function getCurrentBeatPattern(): BeatPattern {
  return currentBeatPattern;
}

// Encode a recording to share
export function encodeRecording(recording: RecordedSequence): string {
  return btoa(JSON.stringify(recording));
}

// Decode a shared recording
export function decodeRecording(encoded: string): RecordedSequence | null {
  try {
    return JSON.parse(atob(encoded));
  } catch (e) {
    console.error('Failed to decode recording:', e);
    return null;
  }
}

// Preload sounds (reference for future use with actual samples)
export const pianoSounds: Record<string, Howl> = {};

export function preloadPianoSounds() {
  // For future implementation with actual samples
  // Object.keys(NOTE_FREQUENCIES).forEach(note => {
  //   pianoSounds[note] = new Howl({
  //     src: [`/piano-sounds/${note}.mp3`],
  //     preload: true,
  //     volume: 0.8
  //   });
  // });
}
