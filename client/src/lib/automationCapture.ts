import { DJMixer, DJDeck } from "./djAudio";
import { SessionRecordingEngine } from "./sessionRecording";

// Automation event types for different DJ controls
export type AutomationEventType = 
  | 'crossfader' 
  | 'volume' 
  | 'pitch' 
  | 'eq_high' 
  | 'eq_mid' 
  | 'eq_low'
  | 'effect_parameter'
  | 'effect_bypass'
  | 'cue_trigger'
  | 'cue_set'
  | 'loop_enable'
  | 'loop_disable'
  | 'loop_set'
  | 'transport_play'
  | 'transport_pause'
  | 'transport_stop'
  | 'transport_seek'
  | 'sync_enable'
  | 'sync_disable'
  | 'track_load'
  | 'master_volume'
  | 'beat_jump'
  | 'loop_roll'
  | 'key_lock';

// Automation event data structure
export interface AutomationEvent {
  id: string;
  timestamp: number; // Seconds from session start
  eventType: AutomationEventType;
  deckId?: string; // 'deckA', 'deckB', or 'master'
  parameter: string; // Parameter name (e.g., 'position', 'wet_mix', 'time')
  value?: number; // Numeric value
  stringValue?: string; // String value for non-numeric data
  previousValue?: number; // Previous value for comparison
  metadata?: {
    trackId?: string;
    effectId?: string;
    cuePointId?: string;
    loopId?: string;
    beatGridPosition?: number;
    [key: string]: any;
  };
}

// Configuration for automation capture with performance controls
export interface AutomationCaptureConfig {
  captureThreshold: number; // Minimum change to trigger capture (0-1)
  sampleRate: number; // Events per second for continuous parameters
  enableSmoothing: boolean; // Smooth out noise in parameter changes
  captureTransportEvents: boolean;
  captureEffectChanges: boolean;
  captureCueEvents: boolean;
  captureLoopEvents: boolean;
  captureEQChanges: boolean;
  capturePitchChanges: boolean;
  captureVolumeChanges: boolean;
  captureSyncEvents: boolean;
  // Performance control settings
  adaptivePerformance: boolean; // Enable adaptive performance optimization
  maxSampleRate: number; // Maximum sample rate for high-end devices
  minSampleRate: number; // Minimum sample rate for low-end devices
  cpuThresholdHigh: number; // CPU usage threshold to reduce quality (0-1)
  cpuThresholdLow: number; // CPU usage threshold to increase quality (0-1)
  maxEventBuffer: number; // Maximum events to buffer before throttling
  debounceTime: number; // Milliseconds to debounce rapid parameter changes
}

// Device performance tiers for adaptive sampling
export enum PerformanceTier {
  HIGH = 'high',
  MEDIUM = 'medium', 
  LOW = 'low'
}

// Performance monitoring data
export interface PerformanceMetrics {
  cpuUsage: number; // Estimated CPU usage (0-1)
  eventRate: number; // Current events per second
  bufferSize: number; // Current buffer size
  droppedEvents: number; // Number of dropped events due to throttling
  tier: PerformanceTier; // Current performance tier
  frameDrops: number; // Number of frame drops detected
  memoryUsage: number; // Estimated memory usage in MB
}

// Professional DJ Automation Capture System with Performance Controls
export class AutomationCaptureEngine {
  private mixer: DJMixer;
  private recordingEngine: SessionRecordingEngine | null = null;
  private config: AutomationCaptureConfig;
  private isCapturing: boolean = false;
  private sessionStartTime: number = 0;
  private events: AutomationEvent[] = [];
  
  // Parameter tracking for change detection
  private lastValues: Map<string, any> = new Map();
  private parameterWatchers: Map<string, ReturnType<typeof setInterval>> = new Map(); // Interval IDs
  private debouncedUpdates: Map<string, number> = new Map(); // Debounce timers
  
  // Event callbacks
  private onEventCapturedCallback?: (event: AutomationEvent) => void;
  private onEventBatchCallback?: (events: AutomationEvent[]) => void;
  private onPerformanceUpdateCallback?: (metrics: PerformanceMetrics) => void;
  
  // Performance optimization and monitoring
  private eventBuffer: AutomationEvent[] = [];
  private bufferFlushInterval: number | null = null;
  private maxBufferSize: number = 1000;
  private performanceMonitor: number | null = null;
  private performanceMetrics: PerformanceMetrics;
  private currentTier: PerformanceTier = PerformanceTier.HIGH;
  private currentSampleRate: number;
  private droppedEvents: number = 0;
  private frameStartTime: number = 0;
  private frameCount: number = 0;
  
  constructor(mixer: DJMixer, config?: Partial<AutomationCaptureConfig>) {
    this.mixer = mixer;
    
    // Detect device performance tier for adaptive settings
    const detectedTier = this.detectDevicePerformance();
    this.currentTier = detectedTier;
    
    // Set defaults based on device performance
    const baseConfig = this.getConfigForTier(detectedTier);
    
    this.config = {
      captureThreshold: 0.001, // 0.1% change threshold
      sampleRate: baseConfig.sampleRate,
      enableSmoothing: true,
      captureTransportEvents: true,
      captureEffectChanges: true,
      captureCueEvents: true,
      captureLoopEvents: true,
      captureEQChanges: true,
      capturePitchChanges: true,
      captureVolumeChanges: true,
      captureSyncEvents: true,
      // Performance controls
      adaptivePerformance: true,
      maxSampleRate: 60,
      minSampleRate: 15,
      cpuThresholdHigh: 0.8, // 80% CPU usage to reduce quality
      cpuThresholdLow: 0.5,  // 50% CPU usage to increase quality
      maxEventBuffer: 2000,
      debounceTime: 16, // ~60fps debouncing (16ms)
      ...config
    };
    
    this.currentSampleRate = this.config.sampleRate;
    
    // Initialize performance metrics
    this.performanceMetrics = {
      cpuUsage: 0,
      eventRate: 0,
      bufferSize: 0,
      droppedEvents: 0,
      tier: this.currentTier,
      frameDrops: 0,
      memoryUsage: 0
    };
  }
  
  // Detect device performance tier based on hardware capabilities
  private detectDevicePerformance(): PerformanceTier {
    try {
      // Check hardware concurrency (CPU cores)
      const cores = navigator.hardwareConcurrency || 4;
      
      // Check device memory (if available)
      const memory = (navigator as any).deviceMemory || 4; // GB
      
      // Check if mobile device
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      
      // Performance scoring based on available metrics
      let score = 0;
      
      if (cores >= 8) score += 3;
      else if (cores >= 4) score += 2;
      else score += 1;
      
      if (memory >= 8) score += 3;
      else if (memory >= 4) score += 2;
      else score += 1;
      
      if (!isMobile) score += 2;
      
      // Assign tier based on score
      if (score >= 7) return PerformanceTier.HIGH;
      else if (score >= 4) return PerformanceTier.MEDIUM;
      else return PerformanceTier.LOW;
      
    } catch (error) {
      console.warn('Failed to detect device performance, using medium tier:', error);
      return PerformanceTier.MEDIUM;
    }
  }
  
  // Get configuration defaults for performance tier
  private getConfigForTier(tier: PerformanceTier): { sampleRate: number } {
    switch (tier) {
      case PerformanceTier.HIGH:
        return { sampleRate: 60 }; // 60 FPS on high-end devices
      case PerformanceTier.MEDIUM:
        return { sampleRate: 30 }; // 30 FPS on medium devices
      case PerformanceTier.LOW:
        return { sampleRate: 15 }; // 15 FPS on low-end devices
      default:
        return { sampleRate: 30 };
    }
  }
  
  // Start automation capture for a recording session
  startCapture(recordingEngine?: SessionRecordingEngine): void {
    if (this.isCapturing) {
      console.warn('Automation capture already active');
      return;
    }
    
    this.recordingEngine = recordingEngine || null;
    this.isCapturing = true;
    this.sessionStartTime = performance.now();
    this.events = [];
    this.eventBuffer = [];
    this.lastValues.clear();
    this.debouncedUpdates.clear();
    this.droppedEvents = 0;
    this.frameCount = 0;
    this.frameStartTime = performance.now();
    
    // Setup all parameter watchers
    this.setupCrossfaderCapture();
    this.setupDeckCapture('deckA', this.mixer.deckA);
    this.setupDeckCapture('deckB', this.mixer.deckB);
    this.setupMasterCapture();
    
    // Start buffer flush interval
    this.startBufferFlush();
    
    // Start performance monitoring if adaptive performance is enabled
    if (this.config.adaptivePerformance) {
      this.startPerformanceMonitoring();
    }
    
    console.log(`Automation capture started with ${this.currentTier} performance tier (${this.currentSampleRate}Hz)`);
  }
  
  // Stop automation capture
  stopCapture(): AutomationEvent[] {
    if (!this.isCapturing) return [];
    
    this.isCapturing = false;
    
    // Clear all parameter watchers
    this.parameterWatchers.forEach(intervalId => clearInterval(intervalId));
    this.parameterWatchers.clear();
    
    // Clear debounced updates
    this.debouncedUpdates.forEach(timerId => clearTimeout(timerId));
    this.debouncedUpdates.clear();
    
    // Stop buffer flush
    this.stopBufferFlush();
    
    // Stop performance monitoring
    this.stopPerformanceMonitoring();
    
    // Flush remaining buffer
    this.flushEventBuffer();
    
    console.log(`Automation capture stopped. Captured ${this.events.length} events (${this.droppedEvents} dropped)`);
    return [...this.events];
  }
  
  // Start performance monitoring
  private startPerformanceMonitoring(): void {
    this.performanceMonitor = window.setInterval(() => {
      this.updatePerformanceMetrics();
      this.adaptPerformance();
    }, 1000); // Monitor every second
  }
  
  // Stop performance monitoring
  private stopPerformanceMonitoring(): void {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = null;
    }
  }
  
  // Update performance metrics
  private updatePerformanceMetrics(): void {
    const now = performance.now();
    const timeDelta = (now - this.frameStartTime) / 1000;
    
    // Calculate event rate
    const eventCount = this.events.length;
    this.performanceMetrics.eventRate = timeDelta > 0 ? eventCount / timeDelta : 0;
    
    // Update buffer size
    this.performanceMetrics.bufferSize = this.eventBuffer.length;
    
    // Update dropped events
    this.performanceMetrics.droppedEvents = this.droppedEvents;
    
    // Estimate CPU usage based on frame performance
    this.frameCount++;
    const expectedFrames = timeDelta * 60; // Assuming 60fps baseline
    const frameEfficiency = this.frameCount / Math.max(expectedFrames, 1);
    this.performanceMetrics.cpuUsage = Math.max(0, Math.min(1, 1 - frameEfficiency + 0.2));
    
    // Estimate memory usage (rough calculation)
    const eventMemory = this.events.length * 0.1; // ~100 bytes per event
    const bufferMemory = this.eventBuffer.length * 0.1;
    this.performanceMetrics.memoryUsage = eventMemory + bufferMemory;
    
    // Update tier
    this.performanceMetrics.tier = this.currentTier;
    
    // Trigger callback
    this.onPerformanceUpdateCallback?.(this.performanceMetrics);
  }
  
  // Adapt performance based on current metrics
  private adaptPerformance(): void {
    const metrics = this.performanceMetrics;
    
    // Adjust sample rate based on CPU usage
    if (metrics.cpuUsage > this.config.cpuThresholdHigh) {
      // Reduce quality if CPU usage is high
      this.reduceSampleRate();
    } else if (metrics.cpuUsage < this.config.cpuThresholdLow) {
      // Increase quality if CPU usage is low
      this.increaseSampleRate();
    }
    
    // Throttle events if buffer is getting full
    if (metrics.bufferSize > this.config.maxEventBuffer * 0.8) {
      this.throttleEventCapture();
    }
  }
  
  // Reduce sample rate for performance
  private reduceSampleRate(): void {
    const newRate = Math.max(this.config.minSampleRate, this.currentSampleRate * 0.75);
    if (newRate !== this.currentSampleRate) {
      this.currentSampleRate = newRate;
      this.restartParameterWatchers();
      console.log(`Reduced automation sample rate to ${newRate}Hz due to high CPU usage`);
    }
  }
  
  // Increase sample rate when performance allows
  private increaseSampleRate(): void {
    const newRate = Math.min(this.config.maxSampleRate, this.currentSampleRate * 1.1);
    if (newRate !== this.currentSampleRate) {
      this.currentSampleRate = newRate;
      this.restartParameterWatchers();
      console.log(`Increased automation sample rate to ${newRate}Hz due to low CPU usage`);
    }
  }
  
  // Restart parameter watchers with new sample rate
  private restartParameterWatchers(): void {
    if (!this.isCapturing) return;
    
    // Clear existing watchers
    this.parameterWatchers.forEach(intervalId => clearInterval(intervalId));
    this.parameterWatchers.clear();
    
    // Restart with new rate
    this.setupCrossfaderCapture();
    this.setupDeckCapture('deckA', this.mixer.deckA);
    this.setupDeckCapture('deckB', this.mixer.deckB);
    this.setupMasterCapture();
  }
  
  // Throttle event capture by dropping events
  private throttleEventCapture(): void {
    // Remove older events from buffer to prevent overflow
    const removeCount = Math.floor(this.eventBuffer.length * 0.1);
    this.eventBuffer.splice(0, removeCount);
    this.droppedEvents += removeCount;
    console.warn(`Dropped ${removeCount} automation events due to buffer overflow`);
  }
  
  // Setup crossfader position capture
  private setupCrossfaderCapture(): void {
    if (!this.config.captureVolumeChanges) return;
    
    const watcherId = setInterval(() => {
      if (!this.isCapturing) return;
      
      const currentValue = this.mixer.crossfaderPosition;
      const lastValue = this.lastValues.get('crossfader_position');
      
      if (this.hasSignificantChange(currentValue, lastValue)) {
        this.captureEvent({
          eventType: 'crossfader',
          deckId: 'master',
          parameter: 'position',
          value: currentValue,
          previousValue: lastValue
        });
        
        this.lastValues.set('crossfader_position', currentValue);
      }
    }, 1000 / this.config.sampleRate);
    
    this.parameterWatchers.set('crossfader', watcherId);
  }
  
  // Setup capture for individual deck
  private setupDeckCapture(deckId: string, deck: DJDeck): void {
    // Volume capture
    if (this.config.captureVolumeChanges) {
      this.setupParameterWatcher(
        `${deckId}_volume`,
        () => deck.volume,
        (value, previousValue) => this.captureEvent({
          eventType: 'volume',
          deckId,
          parameter: 'level',
          value,
          previousValue
        })
      );
    }
    
    // Pitch capture
    if (this.config.capturePitchChanges) {
      this.setupParameterWatcher(
        `${deckId}_pitch`,
        () => deck.getPitchPercentage(),
        (value, previousValue) => this.captureEvent({
          eventType: 'pitch',
          deckId,
          parameter: 'percentage',
          value,
          previousValue
        })
      );
    }
    
    // EQ capture
    if (this.config.captureEQChanges) {
      this.setupEQCapture(deckId, deck);
    }
    
    // Effects capture
    if (this.config.captureEffectChanges) {
      this.setupEffectsCapture(deckId, deck);
    }
    
    // Transport events
    if (this.config.captureTransportEvents) {
      this.setupTransportCapture(deckId, deck);
    }
    
    // Cue and loop events
    if (this.config.captureCueEvents) {
      this.setupCueCapture(deckId, deck);
    }
    
    if (this.config.captureLoopEvents) {
      this.setupLoopCapture(deckId, deck);
    }
    
    // Sync events
    if (this.config.captureSyncEvents) {
      this.setupSyncCapture(deckId, deck);
    }
  }
  
  // Setup EQ parameter capture
  private setupEQCapture(deckId: string, deck: DJDeck): void {
    const eqEffect = deck.getEffect('eq3');
    if (!eqEffect) return;
    
    // High EQ
    this.setupParameterWatcher(
      `${deckId}_eq_high`,
      () => eqEffect.getParameter('high'),
      (value, previousValue) => this.captureEvent({
        eventType: 'eq_high',
        deckId,
        parameter: 'high',
        value,
        previousValue,
        metadata: { effectId: 'eq3' }
      })
    );
    
    // Mid EQ
    this.setupParameterWatcher(
      `${deckId}_eq_mid`,
      () => eqEffect.getParameter('mid'),
      (value, previousValue) => this.captureEvent({
        eventType: 'eq_mid',
        deckId,
        parameter: 'mid',
        value,
        previousValue,
        metadata: { effectId: 'eq3' }
      })
    );
    
    // Low EQ
    this.setupParameterWatcher(
      `${deckId}_eq_low`,
      () => eqEffect.getParameter('low'),
      (value, previousValue) => this.captureEvent({
        eventType: 'eq_low',
        deckId,
        parameter: 'low',
        value,
        previousValue,
        metadata: { effectId: 'eq3' }
      })
    );
  }
  
  // Setup effects parameter capture
  private setupEffectsCapture(deckId: string, deck: DJDeck): void {
    const effects = deck.getEffects();
    
    effects.forEach(effect => {
      // Skip EQ as it's handled separately
      if (effect.id === 'eq3') return;
      
      // Monitor all effect parameters
      Object.keys(effect.parameters).forEach(paramName => {
        const watcherKey = `${deckId}_${effect.id}_${paramName}`;
        
        this.setupParameterWatcher(
          watcherKey,
          () => effect.getParameter(paramName),
          (value, previousValue) => this.captureEvent({
            eventType: 'effect_parameter',
            deckId,
            parameter: paramName,
            value,
            previousValue,
            metadata: { 
              effectId: effect.id,
              effectType: effect.effectType
            }
          })
        );
      });
      
      // Monitor effect bypass state
      this.setupParameterWatcher(
        `${deckId}_${effect.id}_bypass`,
        () => (effect as unknown as { bypass: boolean }).bypass ? 1 : 0,
        (value, previousValue) => this.captureEvent({
          eventType: 'effect_bypass',
          deckId,
          parameter: 'bypass',
          value,
          previousValue,
          metadata: { 
            effectId: effect.id,
            effectType: effect.effectType
          }
        })
      );
    });
  }
  
  // Setup transport event capture
  private setupTransportCapture(deckId: string, deck: DJDeck): void {
    // Monitor play state changes
    let lastPlayState = deck.isPlaying;
    
    const watcherId = setInterval(() => {
      if (!this.isCapturing) return;
      
      const currentPlayState = deck.isPlaying;
      
      if (currentPlayState !== lastPlayState) {
        const eventType = currentPlayState ? 'transport_play' : 
                         lastPlayState ? 'transport_pause' : 'transport_stop';
        
        this.captureEvent({
          eventType: eventType as AutomationEventType,
          deckId,
          parameter: 'state',
          value: currentPlayState ? 1 : 0,
          metadata: {
            trackId: deck.trackInfo?.title,
            currentTime: deck.currentTime
          }
        });
        
        lastPlayState = currentPlayState;
      }
    }, 100); // Check every 100ms for responsive transport capture
    
    this.parameterWatchers.set(`${deckId}_transport`, watcherId);
    
    // Monitor seek events by tracking currentTime jumps
    let lastCurrentTime = deck.currentTime;
    
    const seekWatcherId = setInterval(() => {
      if (!this.isCapturing || !deck.isPlaying) return;
      
      const currentTime = deck.currentTime;
      const timeDiff = Math.abs(currentTime - lastCurrentTime);
      
      // Detect seeks (time jumps > 1 second while playing)
      if (timeDiff > 1.0) {
        this.captureEvent({
          eventType: 'transport_seek',
          deckId,
          parameter: 'position',
          value: currentTime,
          previousValue: lastCurrentTime,
          metadata: {
            trackId: deck.trackInfo?.title,
            seekDistance: timeDiff
          }
        });
      }
      
      lastCurrentTime = currentTime;
    }, 250); // Check every 250ms
    
    this.parameterWatchers.set(`${deckId}_seek`, seekWatcherId);
  }
  
  // Setup cue point event capture
  private setupCueCapture(deckId: string, deck: DJDeck): void {
    // Monitor cue point changes
    let lastCuePoints = [...deck.cuePoints];
    
    const watcherId = setInterval(() => {
      if (!this.isCapturing) return;
      
      const currentCuePoints = deck.cuePoints;
      
      // Check for new cue points
      currentCuePoints.forEach(cue => {
        const existingCue = lastCuePoints.find(c => c.id === cue.id);
        
        if (!existingCue) {
          this.captureEvent({
            eventType: 'cue_set',
            deckId,
            parameter: 'position',
            value: cue.time,
            metadata: {
              cuePointId: cue.id,
              cueName: cue.name,
              cueColor: cue.color,
              cueType: cue.type,
              hotCueNumber: cue.hotCueNumber
            }
          });
        }
      });
      
      lastCuePoints = [...currentCuePoints];
    }, 500); // Check every 500ms
    
    this.parameterWatchers.set(`${deckId}_cues`, watcherId);
  }
  
  // Setup loop event capture
  private setupLoopCapture(deckId: string, deck: DJDeck): void {
    // Monitor loop state changes
    let lastLoops = [...deck.loops];
    
    const watcherId = setInterval(() => {
      if (!this.isCapturing) return;
      
      const currentLoops = deck.loops;
      
      // Check for loop state changes
      currentLoops.forEach(loop => {
        const lastLoop = lastLoops.find(l => l.id === loop.id);
        
        if (!lastLoop) {
          // New loop created
          this.captureEvent({
            eventType: 'loop_set',
            deckId,
            parameter: 'region',
            value: loop.startTime,
            metadata: {
              loopId: loop.id,
              loopName: loop.name,
              startTime: loop.startTime,
              endTime: loop.endTime,
              beatLength: loop.beatLength
            }
          });
        } else if (lastLoop.isActive !== loop.isActive) {
          // Loop enabled/disabled
          this.captureEvent({
            eventType: loop.isActive ? 'loop_enable' : 'loop_disable',
            deckId,
            parameter: 'active',
            value: loop.isActive ? 1 : 0,
            metadata: {
              loopId: loop.id,
              loopName: loop.name,
              beatLength: loop.beatLength
            }
          });
        }
      });
      
      lastLoops = [...currentLoops];
    }, 250); // Check every 250ms for responsive loop detection
    
    this.parameterWatchers.set(`${deckId}_loops`, watcherId);
  }
  
  // Setup sync event capture
  private setupSyncCapture(deckId: string, deck: DJDeck): void {
    let lastSyncState = deck.syncState.isSynced;
    
    const watcherId = setInterval(() => {
      if (!this.isCapturing) return;
      
      const currentSyncState = deck.syncState.isSynced;
      
      if (currentSyncState !== lastSyncState) {
        this.captureEvent({
          eventType: currentSyncState ? 'sync_enable' : 'sync_disable',
          deckId,
          parameter: 'enabled',
          value: currentSyncState ? 1 : 0,
          metadata: {
            masterDeck: deck.syncState.masterDeck,
            syncAccuracy: deck.syncState.syncAccuracy,
            beatOffset: deck.syncState.beatOffset
          }
        });
        
        lastSyncState = currentSyncState;
      }
    }, 200); // Check every 200ms
    
    this.parameterWatchers.set(`${deckId}_sync`, watcherId);
  }
  
  // Setup master volume capture
  private setupMasterCapture(): void {
    if (!this.config.captureVolumeChanges) return;
    
    this.setupParameterWatcher(
      'master_volume',
      () => this.mixer.masterVolume,
      (value, previousValue) => this.captureEvent({
        eventType: 'master_volume',
        deckId: 'master',
        parameter: 'level',
        value,
        previousValue
      })
    );
  }
  
  // Generic parameter watcher setup
  private setupParameterWatcher(
    key: string,
    valueGetter: () => number,
    onChange: (value: number, previousValue?: number) => void
  ): void {
    const watcherId = setInterval(() => {
      if (!this.isCapturing) return;
      
      const currentValue = valueGetter();
      const lastValue = this.lastValues.get(key);
      
      if (this.hasSignificantChange(currentValue, lastValue)) {
        onChange(currentValue, lastValue);
        this.lastValues.set(key, currentValue);
      }
    }, 1000 / this.config.sampleRate);
    
    this.parameterWatchers.set(key, watcherId);
  }
  
  // Check if a parameter change is significant enough to capture
  private hasSignificantChange(currentValue: number, lastValue?: number): boolean {
    if (lastValue === undefined) return true;
    
    const threshold = this.config.captureThreshold;
    const change = Math.abs(currentValue - lastValue);
    
    // Use relative threshold for values > 1, absolute for smaller values
    const effectiveThreshold = Math.abs(lastValue) > 1 ? 
      Math.abs(lastValue) * threshold : threshold;
    
    return change >= effectiveThreshold;
  }
  
  // Capture an automation event
  private captureEvent(eventData: Partial<AutomationEvent>): void {
    if (!this.isCapturing) return;
    
    const event: AutomationEvent = {
      id: crypto.randomUUID(),
      timestamp: (performance.now() - this.sessionStartTime) / 1000,
      eventType: eventData.eventType!,
      deckId: eventData.deckId,
      parameter: eventData.parameter!,
      value: eventData.value,
      stringValue: eventData.stringValue,
      previousValue: eventData.previousValue,
      metadata: eventData.metadata
    };
    
    // Apply smoothing if enabled
    if (this.config.enableSmoothing && event.value !== undefined) {
      event.value = this.applySmoothingFilter(event);
    }
    
    // Add to buffer
    this.eventBuffer.push(event);
    
    // Trigger immediate callback
    this.onEventCapturedCallback?.(event);
    
    // Check buffer size
    if (this.eventBuffer.length >= this.maxBufferSize) {
      this.flushEventBuffer();
    }
  }
  
  // Apply smoothing filter to reduce noise
  private applySmoothingFilter(event: AutomationEvent): number {
    if (event.value === undefined) return 0;
    
    // Simple low-pass filter for smoothing
    const alpha = 0.8; // Smoothing factor
    const previousValue = event.previousValue || event.value;
    
    return alpha * event.value + (1 - alpha) * previousValue;
  }
  
  // Start buffer flush interval
  private startBufferFlush(): void {
    this.bufferFlushInterval = window.setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flushEventBuffer();
      }
    }, 1000); // Flush every second
  }
  
  // Stop buffer flush interval
  private stopBufferFlush(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }
  }
  
  // Flush event buffer to main events array
  private flushEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;
    
    // Sort events by timestamp
    this.eventBuffer.sort((a, b) => a.timestamp - b.timestamp);
    
    // Add to main events array
    this.events.push(...this.eventBuffer);
    
    // Trigger batch callback
    this.onEventBatchCallback?.([...this.eventBuffer]);
    
    // Clear buffer
    this.eventBuffer = [];
  }
  
  // Get all captured events
  getEvents(): AutomationEvent[] {
    return [...this.events];
  }
  
  // Get events in time range
  getEventsInRange(startTime: number, endTime: number): AutomationEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }
  
  // Get events by type
  getEventsByType(eventType: AutomationEventType): AutomationEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }
  
  // Get events by deck
  getEventsByDeck(deckId: string): AutomationEvent[] {
    return this.events.filter(event => event.deckId === deckId);
  }
  
  // Export events to JSON
  exportEvents(): string {
    return JSON.stringify({
      captureConfig: this.config,
      sessionDuration: this.isCapturing ? 
        (performance.now() - this.sessionStartTime) / 1000 : 0,
      eventCount: this.events.length,
      events: this.events
    }, null, 2);
  }
  
  // Import events from JSON
  importEvents(jsonData: string): AutomationEvent[] {
    try {
      const data = JSON.parse(jsonData);
      this.events = data.events || [];
      return this.events;
    } catch (error) {
      console.error('Failed to import automation events:', error);
      return [];
    }
  }
  
  // Event handler setters
  onEventCaptured(callback: (event: AutomationEvent) => void): void {
    this.onEventCapturedCallback = callback;
  }
  
  onEventBatch(callback: (events: AutomationEvent[]) => void): void {
    this.onEventBatchCallback = callback;
  }
  
  // Update configuration
  updateConfig(config: Partial<AutomationCaptureConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  // Manual event capture for UI interactions
  captureManualEvent(eventData: Partial<AutomationEvent>): void {
    this.captureEvent(eventData);
  }
  
  // Cleanup resources
  destroy(): void {
    this.stopCapture();
    this.events = [];
    this.eventBuffer = [];
    this.lastValues.clear();
    console.log('Automation capture engine destroyed');
  }
}

// Utility functions for automation analysis
export function analyzeTransitions(events: AutomationEvent[]): {
  transitionCount: number;
  avgTransitionTime: number;
  crossfaderUsage: number;
  effectsUsage: number;
} {
  const crossfaderEvents = events.filter(e => e.eventType === 'crossfader');
  const effectEvents = events.filter(e => e.eventType.startsWith('effect_'));
  const transportEvents = events.filter(e => e.eventType.startsWith('transport_'));
  
  // Count significant crossfader movements (> 10% change)
  const significantMoves = crossfaderEvents.filter(e => 
    e.previousValue !== undefined && 
    Math.abs(e.value! - e.previousValue) > 0.1
  );
  
  // Calculate average transition time
  let totalTransitionTime = 0;
  let transitionCount = 0;
  
  for (let i = 1; i < transportEvents.length; i++) {
    if (transportEvents[i].eventType === 'transport_play' && 
        transportEvents[i-1].eventType === 'transport_pause') {
      totalTransitionTime += transportEvents[i].timestamp - transportEvents[i-1].timestamp;
      transitionCount++;
    }
  }
  
  return {
    transitionCount: significantMoves.length,
    avgTransitionTime: transitionCount > 0 ? totalTransitionTime / transitionCount : 0,
    crossfaderUsage: crossfaderEvents.length,
    effectsUsage: effectEvents.length
  };
}

export function calculateBeatMatching(events: AutomationEvent[]): {
  accuracy: number;
  syncUsage: number;
  manualAdjustments: number;
} {
  const syncEvents = events.filter(e => e.eventType === 'sync_enable');
  const pitchEvents = events.filter(e => e.eventType === 'pitch');
  
  // Calculate sync accuracy based on sync enable events with metadata
  const accuracyValues = syncEvents
    .map(e => e.metadata?.syncAccuracy)
    .filter(acc => acc !== undefined);
  
  const avgAccuracy = accuracyValues.length > 0 ? 
    accuracyValues.reduce((sum, acc) => sum + acc, 0) / accuracyValues.length : 0;
  
  return {
    accuracy: avgAccuracy,
    syncUsage: syncEvents.length,
    manualAdjustments: pitchEvents.length
  };
}

export function analyzeEQUsage(events: AutomationEvent[]): {
  highUsage: number;
  midUsage: number;
  lowUsage: number;
  creativityScore: number;
} {
  const eqHighEvents = events.filter(e => e.eventType === 'eq_high');
  const eqMidEvents = events.filter(e => e.eventType === 'eq_mid');
  const eqLowEvents = events.filter(e => e.eventType === 'eq_low');
  
  // Calculate creativity score based on EQ variation
  const allEQEvents = [...eqHighEvents, ...eqMidEvents, ...eqLowEvents];
  const uniqueValues = new Set(allEQEvents.map(e => e.value));
  const creativityScore = Math.min(uniqueValues.size / 20, 1); // Normalize to 0-1
  
  return {
    highUsage: eqHighEvents.length,
    midUsage: eqMidEvents.length,
    lowUsage: eqLowEvents.length,
    creativityScore
  };
}

export function generatePerformanceReport(events: AutomationEvent[]): {
  summary: string;
  metrics: Record<string, number>;
  suggestions: string[];
} {
  const transitions = analyzeTransitions(events);
  const beatMatching = calculateBeatMatching(events);
  const eqUsage = analyzeEQUsage(events);
  
  const metrics = {
    transitionCount: transitions.transitionCount,
    crossfaderUsage: transitions.crossfaderUsage,
    beatMatchAccuracy: beatMatching.accuracy,
    eqCreativity: eqUsage.creativityScore,
    totalEvents: events.length
  };
  
  const suggestions: string[] = [];
  
  if (beatMatching.accuracy < 0.7) {
    suggestions.push('Consider practicing beat matching to improve sync accuracy');
  }
  
  if (eqUsage.creativityScore < 0.3) {
    suggestions.push('Experiment more with EQ adjustments to add creative flair');
  }
  
  if (transitions.transitionCount < 3) {
    suggestions.push('Try incorporating more crossfader transitions');
  }
  
  const summary = `Performance captured ${events.length} automation events over ${
    events.length > 0 ? (events[events.length - 1].timestamp / 60).toFixed(1) : 0
  } minutes. Beat matching accuracy: ${(beatMatching.accuracy * 100).toFixed(1)}%`;
  
  return { summary, metrics, suggestions };
}