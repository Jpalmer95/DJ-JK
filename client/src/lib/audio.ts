import { Howl } from "howler";

// Define frequencies for different piano notes
const NOTE_FREQUENCIES: Record<string, number> = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
};

// Audio context for WebAudio API
let audioContext: AudioContext | null = null;

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

// Play a note using WebAudio API
export function playNote(note: string, volume: number = 0.8) {
  if (!audioContext) {
    audioContext = initAudioContext();
  }
  
  const frequency = NOTE_FREQUENCIES[note] || 440;
  
  // Create oscillator and gain nodes
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Configure oscillator
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  
  // Apply envelope for a piano-like sound
  gainNode.gain.value = 0;
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.02);
  gainNode.gain.linearRampToValueAtTime(volume * 0.7, audioContext.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
  
  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Start and stop oscillator
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 1.5);
  
  return oscillator;
}

// Preload piano sounds with Howler (alternative method)
// These would typically be actual piano samples but we're using WebAudio API instead
// This is kept as reference in case we want to switch to sample-based sounds later
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
