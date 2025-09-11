import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { DJDeck } from '@/lib/djAudio';
import { VisualEffectsEngine, EffectConfig, VisualTheme } from '@/lib/visualEffects';
import { BeatDetector, BeatInfo, SpectralFeatures, TransientInfo } from '@/lib/beatDetection';
import { 
  Maximize2, 
  Minimize2, 
  Settings, 
  Volume2, 
  Activity, 
  Camera,
  Download,
  Share2,
  Palette,
  Zap,
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw
} from 'lucide-react';

interface FullScreenVisualizerProps {
  deck: DJDeck;
  otherDeck?: DJDeck;
  isVisible: boolean;
  onClose: () => void;
  width?: number;
  height?: number;
  enableRecording?: boolean;
}

interface FullScreenConfig {
  theme: VisualTheme;
  effects: EffectConfig[];
  showControls: boolean;
  showBeatInfo: boolean;
  showSpectrumBands: boolean;
  showFrequencyInfo: boolean;
  showPerformanceStats: boolean;
  immersiveMode: boolean;
  recordingEnabled: boolean;
  resolution: 'HD' | 'FHD' | '4K';
  frameRate: number;
}

interface PerformanceMetrics {
  fps: number;
  cpuUsage: number;
  memoryUsage: number;
  renderTime: number;
  audioLatency: number;
}

export default function FullScreenVisualizer({
  deck,
  otherDeck,
  isVisible,
  onClose,
  width = 1920,
  height = 1080,
  enableRecording = false
}: FullScreenVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const visualEngineRef = useRef<VisualEffectsEngine | null>(null);
  const beatDetectorRef = useRef<BeatDetector | null>(null);
  const recordingRef = useRef<MediaRecorder | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  
  // Audio analysis state
  const [beatInfo, setBeatInfo] = useState<BeatInfo | null>(null);
  const [spectralFeatures, setSpectralFeatures] = useState<SpectralFeatures | null>(null);
  const [transientInfo, setTransientInfo] = useState<TransientInfo | null>(null);
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    cpuUsage: 0,
    memoryUsage: 0,
    renderTime: 16.67,
    audioLatency: 0
  });

  // Configuration state
  const [config, setConfig] = useState<FullScreenConfig>({
    theme: {
      id: 'immersive-dark',
      name: 'Immersive Dark',
      primaryColor: '#00d4ff',
      secondaryColor: '#ff0080',
      accentColor: '#ffff00',
      backgroundColor: '#000000',
      gradientColors: ['#000428', '#004e92', '#009ffd'],
      particleColor: '#00d4ff',
      waveformColor: '#00ff88',
      spectrumColors: ['#ff0080', '#ff4000', '#ffff00', '#00ff88', '#00d4ff'],
      glowIntensity: 1.2,
      saturation: 1.1,
      brightness: 1.0,
      contrast: 1.3
    },
    effects: [
      {
        type: 'particles',
        enabled: true,
        intensity: 1.2,
        speed: 1.5,
        scale: 1.0,
        opacity: 0.9,
        beatReactive: true,
        frequencyReactive: true,
        colorCycling: true,
        particleConfig: {
          count: 300,
          size: 5,
          speed: 4,
          life: 300,
          gravity: 0.005,
          friction: 0.98,
          elasticity: 0.9,
          trailLength: 25,
          blendMode: 'screen',
          shape: 'circle'
        }
      },
      {
        type: 'plasma',
        enabled: true,
        intensity: 0.8,
        speed: 1.2,
        scale: 1.0,
        opacity: 0.4,
        beatReactive: false,
        frequencyReactive: true,
        colorCycling: true
      },
      {
        type: 'spectrum',
        enabled: true,
        intensity: 1.0,
        speed: 1.0,
        scale: 0.9,
        opacity: 0.8,
        beatReactive: true,
        frequencyReactive: true,
        colorCycling: false
      },
      {
        type: 'tunnel',
        enabled: false,
        intensity: 0.7,
        speed: 0.8,
        scale: 1.0,
        opacity: 0.6,
        beatReactive: true,
        frequencyReactive: false,
        colorCycling: false
      },
      {
        type: 'lightning',
        enabled: true,
        intensity: 1.0,
        speed: 2.0,
        scale: 1.0,
        opacity: 0.7,
        beatReactive: true,
        frequencyReactive: true,
        colorCycling: false
      }
    ],
    showControls: true,
    showBeatInfo: true,
    showSpectrumBands: true,
    showFrequencyInfo: false,
    showPerformanceStats: false,
    immersiveMode: false,
    recordingEnabled: enableRecording,
    resolution: 'FHD',
    frameRate: 60
  });

  // Auto-hide controls timer
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Screen dimensions
  const [screenDimensions, setScreenDimensions] = useState({
    width: width,
    height: height
  });

  // Initialize visual engine when visible
  useEffect(() => {
    if (!isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set up full screen canvas
    updateCanvasSize();
    
    const renderConfig = {
      width: screenDimensions.width,
      height: screenDimensions.height,
      fps: config.frameRate,
      quality: 'ultra' as const,
      enableWebGL: true,
      enablePostProcessing: true,
      enableBloom: true,
      enableMotionBlur: true,
      antiAliasing: true
    };

    visualEngineRef.current = new VisualEffectsEngine(canvas, renderConfig);
    
    // Apply initial configuration
    applyConfiguration();
    
    return () => {
      cleanup();
    };
  }, [isVisible, screenDimensions]);

  // Initialize beat detector
  useEffect(() => {
    if (!deck || !isVisible) return;

    const analyzerNode = deck['analyserNode'];
    const audioContext = deck['audioContext'];
    
    if (audioContext && analyzerNode) {
      beatDetectorRef.current = new BeatDetector(audioContext, analyzerNode);
      
      beatDetectorRef.current.onBeat(setBeatInfo);
      beatDetectorRef.current.onSpectralFeatures(setSpectralFeatures);
      beatDetectorRef.current.onTransient(setTransientInfo);
    }

    return () => {
      beatDetectorRef.current?.stopDetection();
      beatDetectorRef.current = null;
    };
  }, [deck, isVisible]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      updateCanvasSize();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Control auto-hide functionality
  useEffect(() => {
    if (!config.immersiveMode) return;

    const resetControlsTimer = () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
      
      setControlsVisible(true);
      
      controlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000); // Hide after 3 seconds
    };

    const handleMouseMove = () => resetControlsTimer();
    const handleKeyPress = () => resetControlsTimer();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyPress);
    
    resetControlsTimer(); // Start initial timer

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyPress);
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [config.immersiveMode]);

  // Start/stop visual engine based on deck playback
  useEffect(() => {
    if (!deck || !visualEngineRef.current) return;

    const handlePlayStateChange = (playing: boolean) => {
      if (playing) {
        startVisuals();
      } else {
        stopVisuals();
      }
    };

    deck.onPlayStateChange?.(handlePlayStateChange);

    if (deck.isPlaying) {
      startVisuals();
    }

    return () => {
      stopVisuals();
    };
  }, [deck]);

  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    if (!container || !canvas) return;

    let newWidth, newHeight;
    
    if (isFullscreen || config.immersiveMode) {
      newWidth = screen.width;
      newHeight = screen.height;
    } else {
      const rect = container.getBoundingClientRect();
      newWidth = rect.width;
      newHeight = rect.height;
    }

    setScreenDimensions({ width: newWidth, height: newHeight });
    
    // Update canvas size
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    
    // Update visual engine
    if (visualEngineRef.current) {
      visualEngineRef.current.resize(newWidth, newHeight);
    }
  }, [isFullscreen, config.immersiveMode]);

  const applyConfiguration = () => {
    if (!visualEngineRef.current) return;

    // Clear existing effects
    visualEngineRef.current.clearEffects();
    
    // Set theme
    visualEngineRef.current.setTheme(config.theme);
    
    // Add effects
    config.effects.forEach(effect => {
      if (effect.enabled) {
        visualEngineRef.current!.addEffect(effect);
      }
    });
  };

  const startVisuals = () => {
    if (!visualEngineRef.current || isActive) return;

    setIsActive(true);
    beatDetectorRef.current?.startDetection();
    visualEngineRef.current.start();
    
    // Start audio data update loop
    updateAudioData();
    
    console.log('Full-screen visualizer started');
  };

  const stopVisuals = () => {
    if (!visualEngineRef.current || !isActive) return;

    setIsActive(false);
    beatDetectorRef.current?.stopDetection();
    visualEngineRef.current.stop();
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    console.log('Full-screen visualizer stopped');
  };

  const updateAudioData = () => {
    if (!visualEngineRef.current || !deck || !isActive) return;

    // Get audio data
    const frequencyData = deck.getFrequencyData();
    const timeDomainData = deck.getTimeDomainData();

    if (frequencyData && timeDomainData) {
      visualEngineRef.current.updateAudioData(
        frequencyData,
        timeDomainData,
        beatInfo || undefined,
        spectralFeatures || undefined,
        transientInfo || undefined
      );
    }

    // Update performance metrics
    const stats = visualEngineRef.current.getPerformanceStats();
    setPerformanceMetrics(prev => ({
      ...prev,
      fps: stats.averageFPS,
      renderTime: stats.frameTime,
      // Simulate CPU and memory usage (in real implementation, you'd use Performance API)
      cpuUsage: Math.min(100, 30 + (stats.frameTime - 16.67) * 2),
      memoryUsage: stats.particleCount * 0.01 + stats.effectCount * 5
    }));

    animationRef.current = requestAnimationFrame(updateAudioData);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  const startRecording = async () => {
    if (!canvasRef.current || !enableRecording) return;

    try {
      const stream = canvasRef.current.captureStream(config.frameRate);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000 // 8 Mbps for high quality
      });

      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dj-visuals-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      recordingRef.current = recorder;
      setIsRecording(true);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Recording failed to start:', error);
    }
  };

  const stopRecording = () => {
    if (recordingRef.current && isRecording) {
      recordingRef.current.stop();
      recordingRef.current = null;
      setIsRecording(false);
      console.log('Recording stopped');
    }
  };

  const takeScreenshot = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dj-visual-screenshot-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const cleanup = () => {
    stopVisuals();
    stopRecording();
    visualEngineRef.current = null;
    beatDetectorRef.current = null;
  };

  const handleConfigChange = (key: keyof FullScreenConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    
    // Apply changes immediately
    if (key === 'effects' || key === 'theme') {
      setTimeout(applyConfiguration, 100);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return;

      switch (event.key) {
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          break;
        case 'F11':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'f':
        case 'F':
          if (event.ctrlKey) {
            event.preventDefault();
            toggleFullscreen();
          }
          break;
        case 's':
        case 'S':
          if (event.ctrlKey) {
            event.preventDefault();
            takeScreenshot();
          }
          break;
        case 'r':
        case 'R':
          if (event.ctrlKey && enableRecording) {
            event.preventDefault();
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }
          break;
        case ' ':
          event.preventDefault();
          if (deck.isPlaying) {
            deck.pause();
          } else {
            deck.play();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, isFullscreen, isRecording, deck, enableRecording]);

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      data-testid="fullscreen-visualizer"
    >
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        data-testid="fullscreen-canvas"
      />

      {/* Overlay Controls */}
      {controlsVisible && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Controls Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 pointer-events-auto">
            <div className="flex items-center justify-between bg-black/20 backdrop-blur-md rounded-lg p-3">
              <div className="flex items-center space-x-4">
                <h2 className="text-white font-semibold">Immersive Visualizer</h2>
                
                {/* Beat Info */}
                {config.showBeatInfo && beatInfo && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-sm">{beatInfo.bpm.toFixed(0)} BPM</span>
                    <div className="w-16 bg-white/20 rounded-full h-1">
                      <div 
                        className="bg-red-500 h-1 rounded-full transition-all duration-75"
                        style={{ width: `${beatInfo.beatPhase * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="flex items-center space-x-2 text-red-400">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm">REC</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Screenshot */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={takeScreenshot}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  data-testid="button-screenshot"
                >
                  <Camera className="w-4 h-4" />
                </Button>

                {/* Recording */}
                {enableRecording && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`${isRecording ? 'text-red-400' : 'text-white/80'} hover:text-white hover:bg-white/10`}
                    data-testid="button-recording"
                  >
                    {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                )}

                {/* Settings */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                {/* Fullscreen */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  data-testid="button-fullscreen-toggle"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>

                {/* Close */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  data-testid="button-close"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Spectrum Bands Overlay */}
          {config.showSpectrumBands && spectralFeatures && (
            <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
              <div className="bg-black/20 backdrop-blur-md rounded-lg p-4">
                <div className="grid grid-cols-7 gap-2">
                  {['Sub', 'Bass', 'LowMid', 'Mid', 'HiMid', 'Pres', 'Bril'].map((band, index) => (
                    <div key={band} className="text-center">
                      <div className="text-xs text-white/60 mb-1">{band}</div>
                      <div className="h-16 bg-white/10 rounded">
                        <div 
                          className="bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 rounded"
                          style={{ 
                            height: `${Math.min(100, (index === 0 ? spectralFeatures.bassEnergy : 
                                      index === 1 ? spectralFeatures.bassEnergy :
                                      index === 2 ? spectralFeatures.midEnergy :
                                      index === 3 ? spectralFeatures.midEnergy :
                                      index === 4 ? spectralFeatures.midEnergy :
                                      index === 5 ? spectralFeatures.highEnergy :
                                      spectralFeatures.highEnergy) / 255 * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Performance Stats Overlay */}
          {config.showPerformanceStats && (
            <div className="absolute top-20 right-4 pointer-events-auto">
              <div className="bg-black/20 backdrop-blur-md rounded-lg p-3 text-white text-xs space-y-1">
                <div>FPS: {performanceMetrics.fps.toFixed(1)}</div>
                <div>CPU: {performanceMetrics.cpuUsage.toFixed(0)}%</div>
                <div>MEM: {performanceMetrics.memoryUsage.toFixed(0)}MB</div>
                <div>Render: {performanceMetrics.renderTime.toFixed(1)}ms</div>
              </div>
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="absolute top-20 left-4 w-80 pointer-events-auto">
              <Card className="bg-black/80 backdrop-blur-md border-white/20">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-white font-semibold">Visual Settings</h3>
                  
                  {/* Effect Toggles */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Active Effects</label>
                    <div className="grid grid-cols-2 gap-2">
                      {config.effects.map((effect, index) => (
                        <div key={effect.type} className="flex items-center space-x-2">
                          <Switch
                            checked={effect.enabled}
                            onCheckedChange={(checked) => {
                              const newEffects = [...config.effects];
                              newEffects[index].enabled = checked;
                              handleConfigChange('effects', newEffects);
                            }}
                            data-testid={`switch-effect-${effect.type}`}
                          />
                          <span className="text-xs text-white/80 capitalize">{effect.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Display Options */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Display Options</label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/80">Beat Info</span>
                        <Switch
                          checked={config.showBeatInfo}
                          onCheckedChange={(checked) => handleConfigChange('showBeatInfo', checked)}
                          data-testid="switch-beat-info"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/80">Spectrum Bands</span>
                        <Switch
                          checked={config.showSpectrumBands}
                          onCheckedChange={(checked) => handleConfigChange('showSpectrumBands', checked)}
                          data-testid="switch-spectrum-bands"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/80">Performance Stats</span>
                        <Switch
                          checked={config.showPerformanceStats}
                          onCheckedChange={(checked) => handleConfigChange('showPerformanceStats', checked)}
                          data-testid="switch-performance-stats"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/80">Immersive Mode</span>
                        <Switch
                          checked={config.immersiveMode}
                          onCheckedChange={(checked) => handleConfigChange('immersiveMode', checked)}
                          data-testid="switch-immersive-mode"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/80">Quick Actions</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={takeScreenshot}
                        className="border-white/20 text-white/80 hover:bg-white/10"
                        data-testid="button-quick-screenshot"
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Screenshot
                      </Button>
                      {enableRecording && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={isRecording ? stopRecording : startRecording}
                          className="border-white/20 text-white/80 hover:bg-white/10"
                          data-testid="button-quick-recording"
                        >
                          {isRecording ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                          {isRecording ? 'Stop' : 'Record'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Keyboard Shortcuts Help */}
          {!config.immersiveMode && (
            <div className="absolute bottom-4 right-4 text-white/40 text-xs pointer-events-none">
              <div>ESC: Close | F11: Fullscreen | Ctrl+S: Screenshot</div>
              {enableRecording && <div>Ctrl+R: Record | Space: Play/Pause</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}