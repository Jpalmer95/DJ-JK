import { initAudioContext } from "./audio";
import { DJMixer } from "./djAudio";

// Recording quality configurations with browser-compatible formats
export interface RecordingQuality {
  id: string;
  name: string;
  sampleRate: number;
  bitDepth: number; // Note: MediaRecorder doesn't control bit depth directly
  channels: number;
  mimeType: string;
  bitrate?: number; // For compressed formats
  fallbackTypes?: string[]; // Fallback MIME types for compatibility
}

// Detect supported audio recording formats for cross-browser compatibility
function getSupportedAudioTypes(): string[] {
  const supportedTypes: string[] = [];
  
  // Test supported MIME types in order of preference
  const testTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];

  testTypes.forEach(type => {
    if (MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      supportedTypes.push(type);
    }
  });

  // Fallback to basic webm if nothing else works
  if (supportedTypes.length === 0) {
    supportedTypes.push('audio/webm');
  }

  return supportedTypes;
}

// Get best supported MIME type for recording quality
function getBestMimeType(preferredTypes: string[]): string {
  const supportedTypes = getSupportedAudioTypes();
  
  for (const preferred of preferredTypes) {
    if (supportedTypes.includes(preferred)) {
      return preferred;
    }
  }
  
  return supportedTypes[0] || 'audio/webm';
}

export const RECORDING_QUALITIES: RecordingQuality[] = [
  {
    id: 'professional',
    name: 'Professional (WebM Opus)',
    sampleRate: 48000,
    bitDepth: 16, // Note: Actual bit depth controlled by browser
    channels: 2,
    mimeType: getBestMimeType(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']),
    bitrate: 256000,
    fallbackTypes: ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  },
  {
    id: 'standard',
    name: 'Standard (WebM)',
    sampleRate: 44100,
    bitDepth: 16,
    channels: 2,
    mimeType: getBestMimeType(['audio/webm', 'audio/mp4', 'audio/ogg']),
    bitrate: 128000,
    fallbackTypes: ['audio/webm', 'audio/mp4', 'audio/ogg']
  },
  {
    id: 'compressed',
    name: 'Compressed (Low Quality)',
    sampleRate: 22050,
    bitDepth: 16,
    channels: 1,
    mimeType: getBestMimeType(['audio/webm', 'audio/mp4', 'audio/ogg']),
    bitrate: 64000,
    fallbackTypes: ['audio/webm', 'audio/mp4', 'audio/ogg']
  }
];

// Recording state types
export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'error';

// Recording track configuration
export interface RecordingTrack {
  id: string;
  name: string;
  enabled: boolean;
  gainNode: GainNode;
  analyserNode: AnalyserNode;
  destinationNode?: MediaStreamAudioDestinationNode;
  mediaRecorder?: MediaRecorder;
  recordedChunks: Blob[];
}

// Recording session configuration
export interface RecordingConfig {
  quality: RecordingQuality;
  enableMasterTrack: boolean;
  enableDeckTracks: boolean;
  enableEffectsProcessing: boolean;
  autoGainControl: boolean;
  targetLevel: number; // -6 to -18 dB
  maxRecordingTime: number; // seconds
  chunkSizeMs: number; // milliseconds for chunked recording
}

// Level meter data
export interface LevelMeterData {
  trackId: string;
  peak: number; // 0-1
  rms: number; // 0-1
  peakDb: number; // dB
  rmsDb: number; // dB
  isClipping: boolean;
}

// Recording session data
export interface RecordingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  config: RecordingConfig;
  tracks: RecordingTrack[];
  waveformData: number[][];
  peakLevels: LevelMeterData[];
  metadata: {
    title?: string;
    description?: string;
    tags: string[];
    genre?: string;
  };
}

// Professional DJ Session Recording Engine
export class SessionRecordingEngine {
  private audioContext: AudioContext | null = null;
  private mixer: DJMixer | null = null;
  private state: RecordingState = 'idle';
  private config: RecordingConfig;
  private session: RecordingSession | null = null;
  private tracks: Map<string, RecordingTrack> = new Map();
  
  // Monitoring and analysis
  private levelMetersActive: boolean = false;
  private levelMeterInterval: number | null = null;
  private waveformAnalysisInterval: number | null = null;
  
  // Event handlers
  private onStateChangeCallback?: (state: RecordingState) => void;
  private onLevelUpdateCallback?: (levels: LevelMeterData[]) => void;
  private onRecordingProgressCallback?: (duration: number) => void;
  private onRecordingCompleteCallback?: (session: RecordingSession) => void;
  private onErrorCallback?: (error: Error) => void;
  
  // Performance optimization
  private recordingStartTime: number = 0;
  private lastProgressUpdate: number = 0;
  private maxBufferSize: number = 50 * 1024 * 1024; // 50MB buffer limit
  
  constructor(mixer: DJMixer, config?: Partial<RecordingConfig>) {
    this.mixer = mixer;
    this.config = {
      quality: RECORDING_QUALITIES[1], // Standard quality default
      enableMasterTrack: true,
      enableDeckTracks: false,
      enableEffectsProcessing: true,
      autoGainControl: true,
      targetLevel: -12, // -12dB target
      maxRecordingTime: 7200, // 2 hours max
      chunkSizeMs: 5000, // 5 second chunks
      ...config
    };
    
    this.initializeAudioContext();
  }
  
  // Initialize Web Audio API context and setup
  private initializeAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = initAudioContext();
    }
  }
  
  // Setup recording tracks and audio graph
  async setupRecording(): Promise<void> {
    if (!this.audioContext || !this.mixer) {
      throw new Error('Audio context or mixer not initialized');
    }
    
    try {
      this.tracks.clear();
      
      // Setup master track recording
      if (this.config.enableMasterTrack) {
        await this.setupMasterTrack();
      }
      
      // Setup individual deck tracks
      if (this.config.enableDeckTracks) {
        await this.setupDeckTracks();
      }
      
      console.log(`Recording setup complete with ${this.tracks.size} tracks`);
    } catch (error) {
      this.handleError(new Error(`Failed to setup recording: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  // Setup master mix recording track
  private async setupMasterTrack(): Promise<void> {
    if (!this.audioContext || !this.mixer) return;
    
    const track: RecordingTrack = {
      id: 'master',
      name: 'Master Mix',
      enabled: true,
      gainNode: this.audioContext.createGain(),
      analyserNode: this.audioContext.createAnalyser(),
      recordedChunks: []
    };
    
    // Configure analyser for level monitoring
    track.analyserNode.fftSize = 1024;
    track.analyserNode.smoothingTimeConstant = 0.3;
    
    // Create MediaStream destination for recording
    track.destinationNode = this.audioContext.createMediaStreamDestination();
    
    // Connect mixer output to recording chain
    // mixer.outputNode -> gainNode -> analyserNode -> destinationNode
    const mixerOutput = this.mixer.getOutputNode();
    if (mixerOutput) {
      mixerOutput.connect(track.gainNode);
      track.gainNode.connect(track.analyserNode);
      track.analyserNode.connect(track.destinationNode);
    }
    
    // Setup MediaRecorder
    await this.setupMediaRecorder(track);
    
    this.tracks.set('master', track);
  }
  
  // Setup individual deck recording tracks
  private async setupDeckTracks(): Promise<void> {
    if (!this.audioContext || !this.mixer) return;
    
    // Setup Deck A
    await this.setupDeckTrack('deckA', 'Deck A', this.mixer.deckA);
    
    // Setup Deck B
    await this.setupDeckTrack('deckB', 'Deck B', this.mixer.deckB);
  }
  
  // Setup recording for individual deck
  private async setupDeckTrack(trackId: string, trackName: string, deck: any): Promise<void> {
    if (!this.audioContext || !deck) return;
    
    const track: RecordingTrack = {
      id: trackId,
      name: trackName,
      enabled: true,
      gainNode: this.audioContext.createGain(),
      analyserNode: this.audioContext.createAnalyser(),
      recordedChunks: []
    };
    
    // Configure analyser
    track.analyserNode.fftSize = 1024;
    track.analyserNode.smoothingTimeConstant = 0.3;
    
    // Create MediaStream destination
    track.destinationNode = this.audioContext.createMediaStreamDestination();
    
    // Connect deck output to recording chain
    const deckOutput = deck.getAnalyserNode ? deck.getAnalyserNode() : deck.outputNode;
    if (deckOutput) {
      deckOutput.connect(track.gainNode);
      track.gainNode.connect(track.analyserNode);
      track.analyserNode.connect(track.destinationNode);
    }
    
    // Setup MediaRecorder
    await this.setupMediaRecorder(track);
    
    this.tracks.set(trackId, track);
  }
  
  // Setup MediaRecorder for a track with fallback support
  private async setupMediaRecorder(track: RecordingTrack): Promise<void> {
    if (!track.destinationNode) return;
    
    const stream = track.destinationNode.stream;
    let mediaRecorder: MediaRecorder | null = null;
    let actualMimeType: string | null = null;
    
    // Try primary MIME type first
    const primaryOptions: MediaRecorderOptions = {
      mimeType: this.config.quality.mimeType,
    };
    
    // Add bitrate for compressed formats
    if (this.config.quality.bitrate) {
      primaryOptions.audioBitsPerSecond = this.config.quality.bitrate;
    }
    
    // Try to create MediaRecorder with preferred format
    if (MediaRecorder.isTypeSupported(this.config.quality.mimeType)) {
      try {
        mediaRecorder = new MediaRecorder(stream, primaryOptions);
        actualMimeType = this.config.quality.mimeType;
        console.log(`Using preferred format for ${track.name}: ${actualMimeType}`);
      } catch (error) {
        console.warn(`Failed to create MediaRecorder with preferred format: ${error}`);
      }
    }
    
    // Try fallback formats if primary failed
    if (!mediaRecorder && this.config.quality.fallbackTypes) {
      for (const fallbackType of this.config.quality.fallbackTypes) {
        if (MediaRecorder.isTypeSupported(fallbackType)) {
          try {
            const fallbackOptions: MediaRecorderOptions = {
              mimeType: fallbackType,
            };
            
            // Scale bitrate for fallback if needed
            if (this.config.quality.bitrate) {
              fallbackOptions.audioBitsPerSecond = this.config.quality.bitrate;
            }
            
            mediaRecorder = new MediaRecorder(stream, fallbackOptions);
            actualMimeType = fallbackType;
            console.log(`Using fallback format for ${track.name}: ${actualMimeType}`);
            break;
          } catch (error) {
            console.warn(`Failed to create MediaRecorder with fallback ${fallbackType}: ${error}`);
          }
        }
      }
    }
    
    // Final fallback - try basic webm without codecs
    if (!mediaRecorder) {
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        actualMimeType = 'audio/webm';
        console.log(`Using basic fallback format for ${track.name}: ${actualMimeType}`);
      } catch (error) {
        // Last resort - no options at all (let browser decide)
        try {
          mediaRecorder = new MediaRecorder(stream);
          actualMimeType = 'unknown';
          console.log(`Using browser default format for ${track.name}`);
        } catch (finalError) {
          throw new Error(`Failed to create MediaRecorder for ${track.name}: ${finalError instanceof Error ? finalError.message : 'Unknown error'}`);
        }
      }
    }
    
    if (!mediaRecorder) {
      throw new Error(`Could not create MediaRecorder for ${track.name} - no supported formats found`);
    }
    
    track.mediaRecorder = mediaRecorder;
    
    // Store actual MIME type used for later reference
    (track as any).actualMimeType = actualMimeType;
    
    // Handle recorded data chunks
    track.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        track.recordedChunks.push(event.data);
        this.checkBufferSize(track);
      }
    };
    
    track.mediaRecorder.onstop = () => {
      console.log(`Recording stopped for track: ${track.name} (format: ${actualMimeType})`);
    };
    
    track.mediaRecorder.onerror = (event) => {
      this.handleError(new Error(`MediaRecorder error for ${track.name}: ${(event as any).error || event}`));
    };
    
    // Check if we can actually start recording (additional safety check)
    try {
      // Test start/stop cycle to ensure MediaRecorder is properly initialized
      const testRecorder = new MediaRecorder(stream, mediaRecorder.mimeType ? { mimeType: mediaRecorder.mimeType } : {});
      testRecorder.start();
      testRecorder.stop();
    } catch (error) {
      console.warn(`MediaRecorder test failed for ${track.name}, but proceeding anyway: ${error}`);
    }
  }
  
  // Start recording session
  async startRecording(sessionTitle?: string): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Recording already in progress');
    }
    
    try {
      this.setState('recording');
      
      await this.setupRecording();
      
      // Create recording session
      this.session = {
        id: crypto.randomUUID(),
        startTime: new Date(),
        duration: 0,
        config: { ...this.config },
        tracks: Array.from(this.tracks.values()),
        waveformData: [],
        peakLevels: [],
        metadata: {
          title: sessionTitle || `DJ Session ${new Date().toLocaleDateString()}`,
          tags: [],
        }
      };
      
      // Start recording on all tracks
      for (const track of this.tracks.values()) {
        if (track.enabled && track.mediaRecorder) {
          track.mediaRecorder.start(this.config.chunkSizeMs);
        }
      }
      
      // Start monitoring
      this.startLevelMonitoring();
      this.startProgressTracking();
      
      this.recordingStartTime = this.audioContext!.currentTime;
      console.log(`Session recording started: ${this.session.title}`);
      
    } catch (error) {
      this.setState('error');
      this.handleError(new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
  
  // Pause recording session
  pauseRecording(): void {
    if (this.state !== 'recording') return;
    
    this.setState('paused');
    
    // Pause all MediaRecorders
    for (const track of this.tracks.values()) {
      if (track.mediaRecorder && track.mediaRecorder.state === 'recording') {
        track.mediaRecorder.pause();
      }
    }
    
    this.stopLevelMonitoring();
    console.log('Recording paused');
  }
  
  // Resume recording session
  resumeRecording(): void {
    if (this.state !== 'paused') return;
    
    this.setState('recording');
    
    // Resume all MediaRecorders
    for (const track of this.tracks.values()) {
      if (track.mediaRecorder && track.mediaRecorder.state === 'paused') {
        track.mediaRecorder.resume();
      }
    }
    
    this.startLevelMonitoring();
    console.log('Recording resumed');
  }
  
  // Stop recording session
  async stopRecording(): Promise<RecordingSession | null> {
    if (this.state !== 'recording' && this.state !== 'paused') return null;
    
    try {
      this.setState('processing');
      
      // Stop all MediaRecorders
      for (const track of this.tracks.values()) {
        if (track.mediaRecorder && track.mediaRecorder.state !== 'inactive') {
          track.mediaRecorder.stop();
        }
      }
      
      this.stopLevelMonitoring();
      this.stopProgressTracking();
      
      if (this.session) {
        this.session.endTime = new Date();
        this.session.duration = (this.audioContext!.currentTime - this.recordingStartTime);
        
        // Process recorded audio data
        await this.processRecordedAudio();
        
        console.log(`Recording completed: ${this.session.duration.toFixed(2)}s`);
        this.onRecordingCompleteCallback?.(this.session);
        
        const completedSession = this.session;
        this.session = null;
        this.setState('idle');
        
        return completedSession;
      }
      
      this.setState('idle');
      return null;
      
    } catch (error) {
      this.setState('error');
      this.handleError(new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return null;
    }
  }
  
  // Process recorded audio data
  private async processRecordedAudio(): Promise<void> {
    if (!this.session) return;
    
    for (const track of this.tracks.values()) {
      if (track.recordedChunks.length > 0) {
        // Combine all chunks into final blob
        const finalBlob = new Blob(track.recordedChunks, { type: this.config.quality.mimeType });
        
        // Generate waveform data for visualization
        try {
          const waveformData = await this.generateWaveformData(finalBlob);
          this.session.waveformData.push(waveformData);
        } catch (error) {
          console.warn(`Failed to generate waveform for ${track.name}:`, error);
        }
        
        // Clear chunks to free memory
        track.recordedChunks = [];
      }
    }
  }
  
  // Generate waveform data from audio blob
  private async generateWaveformData(audioBlob: Blob): Promise<number[]> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = 1000; // Number of waveform samples
      const blockSize = Math.floor(channelData.length / samples);
      const waveformData: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveformData.push(sum / blockSize);
      }
      
      return waveformData;
    } catch (error) {
      console.error('Failed to generate waveform data:', error);
      return [];
    }
  }
  
  // Start level monitoring for all tracks
  private startLevelMonitoring(): void {
    if (this.levelMetersActive) return;
    
    this.levelMetersActive = true;
    this.levelMeterInterval = window.setInterval(() => {
      const levels: LevelMeterData[] = [];
      
      for (const track of this.tracks.values()) {
        const levelData = this.analyzeLevels(track);
        if (levelData) {
          levels.push(levelData);
        }
      }
      
      this.onLevelUpdateCallback?.(levels);
    }, 50); // 20 FPS level updates
  }
  
  // Stop level monitoring
  private stopLevelMonitoring(): void {
    this.levelMetersActive = false;
    if (this.levelMeterInterval) {
      clearInterval(this.levelMeterInterval);
      this.levelMeterInterval = null;
    }
  }
  
  // Analyze audio levels for a track
  private analyzeLevels(track: RecordingTrack): LevelMeterData | null {
    if (!track.analyserNode) return null;
    
    const bufferLength = track.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    track.analyserNode.getByteFrequencyData(dataArray);
    
    // Calculate RMS and peak values
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] / 255;
      sum += value * value;
      peak = Math.max(peak, value);
    }
    
    const rms = Math.sqrt(sum / bufferLength);
    
    // Convert to dB
    const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    
    // Check for clipping (above -0.1dB)
    const isClipping = peakDb > -0.1;
    
    return {
      trackId: track.id,
      peak,
      rms,
      peakDb,
      rmsDb,
      isClipping
    };
  }
  
  // Start progress tracking
  private startProgressTracking(): void {
    const updateProgress = () => {
      if (this.state === 'recording' && this.audioContext) {
        const currentTime = this.audioContext.currentTime;
        const duration = currentTime - this.recordingStartTime;
        
        // Update progress every second
        if (currentTime - this.lastProgressUpdate >= 1.0) {
          this.onRecordingProgressCallback?.(duration);
          this.lastProgressUpdate = currentTime;
          
          // Check maximum recording time
          if (duration >= this.config.maxRecordingTime) {
            console.warn('Maximum recording time reached, stopping recording');
            this.stopRecording();
            return;
          }
        }
        
        requestAnimationFrame(updateProgress);
      }
    };
    
    requestAnimationFrame(updateProgress);
  }
  
  // Stop progress tracking
  private stopProgressTracking(): void {
    this.lastProgressUpdate = 0;
  }
  
  // Check buffer size and manage memory
  private checkBufferSize(track: RecordingTrack): void {
    const totalSize = track.recordedChunks.reduce((total, chunk) => total + chunk.size, 0);
    
    if (totalSize > this.maxBufferSize) {
      console.warn(`Buffer size limit reached for ${track.name}, implementing chunk management`);
      // In a production system, you would save chunks to persistent storage here
      // For now, we'll just log the warning
    }
  }
  
  // Handle recording errors
  private handleError(error: Error): void {
    console.error('Recording error:', error);
    this.onErrorCallback?.(error);
    this.setState('error');
  }
  
  // Update recording state
  private setState(newState: RecordingState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChangeCallback?.(newState);
    }
  }
  
  // Public getters
  getState(): RecordingState {
    return this.state;
  }
  
  getCurrentSession(): RecordingSession | null {
    return this.session;
  }
  
  getRecordingTracks(): RecordingTrack[] {
    return Array.from(this.tracks.values());
  }
  
  // Update recording configuration
  updateConfig(config: Partial<RecordingConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  // Export recorded audio as blob
  async exportTrackAudio(trackId: string): Promise<Blob | null> {
    const track = this.tracks.get(trackId);
    if (!track || track.recordedChunks.length === 0) return null;
    
    return new Blob(track.recordedChunks, { type: this.config.quality.mimeType });
  }
  
  // Event handler setters
  onStateChange(callback: (state: RecordingState) => void): void {
    this.onStateChangeCallback = callback;
  }
  
  onLevelUpdate(callback: (levels: LevelMeterData[]) => void): void {
    this.onLevelUpdateCallback = callback;
  }
  
  onRecordingProgress(callback: (duration: number) => void): void {
    this.onRecordingProgressCallback = callback;
  }
  
  onRecordingComplete(callback: (session: RecordingSession) => void): void {
    this.onRecordingCompleteCallback = callback;
  }
  
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }
  
  // Cleanup resources
  destroy(): void {
    this.stopLevelMonitoring();
    this.stopProgressTracking();
    
    // Stop any active recordings
    if (this.state === 'recording' || this.state === 'paused') {
      this.stopRecording();
    }
    
    // Disconnect and cleanup tracks
    for (const track of this.tracks.values()) {
      if (track.gainNode) {
        track.gainNode.disconnect();
      }
      if (track.analyserNode) {
        track.analyserNode.disconnect();
      }
      if (track.destinationNode) {
        track.destinationNode.disconnect();
      }
      track.recordedChunks = [];
    }
    
    this.tracks.clear();
    this.session = null;
    
    console.log('Session recording engine destroyed');
  }
}

// Utility functions for recording management
export function formatRecordingDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

export function linearToDb(linear: number): number {
  return linear > 0 ? 20 * Math.log10(linear) : -Infinity;
}

export function getLevelColor(peakDb: number): string {
  if (peakDb > -0.1) return '#ff0000'; // Red - clipping
  if (peakDb > -6) return '#ffa500';   // Orange - hot
  if (peakDb > -18) return '#00ff00';  // Green - good
  return '#808080';                    // Gray - low
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}