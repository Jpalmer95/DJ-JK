import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { DJDeck } from '@/lib/djAudio';
import { VisualEffectsEngine, EffectConfig, VisualTheme } from '@/lib/visualEffects';
import { BeatDetector, BeatInfo, SpectralFeatures, TransientInfo } from '@/lib/beatDetection';
import { 
  Zap, 
  Sparkles, 
  Waves, 
  CircleDot, 
  Palette, 
  Settings,
  Play,
  Pause,
  RotateCcw,
  Maximize2
} from 'lucide-react';

interface BeatReactiveVisualsProps {
  deck: DJDeck;
  otherDeck?: DJDeck;
  width?: number;
  height?: number;
  className?: string;
  autoStart?: boolean;
}

interface VisualPreset {
  id: string;
  name: string;
  description: string;
  effects: EffectConfig[];
  theme: VisualTheme;
}

export default function BeatReactiveVisuals({
  deck,
  otherDeck,
  width = 800,
  height = 400,
  className = '',
  autoStart = true
}: BeatReactiveVisualsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualEngineRef = useRef<VisualEffectsEngine | null>(null);
  const beatDetectorRef = useRef<BeatDetector | null>(null);
  const animationRef = useRef<number | null>(null);

  const [isActive, setIsActive] = useState<boolean>(autoStart);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [currentPreset, setCurrentPreset] = useState<string>('club-night');
  const [beatInfo, setBeatInfo] = useState<BeatInfo | null>(null);
  const [spectralFeatures, setSpectralFeatures] = useState<SpectralFeatures | null>(null);
  const [transientInfo, setTransientInfo] = useState<TransientInfo | null>(null);

  // Visual control state
  const [visualControls, setVisualControls] = useState({
    intensity: 1.0,
    speed: 1.0,
    sensitivity: 0.8,
    colorCycling: true,
    beatReactive: true,
    particleCount: 100,
    glowIntensity: 0.8,
    showBeatIndicators: true,
    showEnergyFlow: true,
    showFrequencyBands: true
  });

  const [performanceStats, setPerformanceStats] = useState({
    fps: 60,
    particleCount: 0,
    effectCount: 0,
    processingTime: 0
  });

  // Predefined visual presets
  const visualPresets: VisualPreset[] = [
    {
      id: 'club-night',
      name: 'Club Night',
      description: 'Dark club atmosphere with neon accents',
      effects: [
        {
          type: 'particles',
          enabled: true,
          intensity: 0.8,
          speed: 1.0,
          scale: 1.0,
          opacity: 0.9,
          beatReactive: true,
          frequencyReactive: true,
          colorCycling: true,
          particleConfig: {
            count: 150,
            size: 4,
            speed: 3,
            life: 240,
            gravity: 0.01,
            friction: 0.99,
            elasticity: 0.8,
            trailLength: 20,
            blendMode: 'screen',
            shape: 'circle'
          }
        },
        {
          type: 'spectrum',
          enabled: true,
          intensity: 1.0,
          speed: 1.0,
          scale: 0.7,
          opacity: 0.8,
          beatReactive: true,
          frequencyReactive: true,
          colorCycling: false
        },
        {
          type: 'circle',
          enabled: true,
          intensity: 0.6,
          speed: 1.2,
          scale: 1.0,
          opacity: 0.5,
          beatReactive: true,
          frequencyReactive: false,
          colorCycling: false
        }
      ],
      theme: {
        id: 'dark-club',
        name: 'Dark Club',
        primaryColor: '#00d4ff',
        secondaryColor: '#ff0080',
        accentColor: '#ffff00',
        backgroundColor: '#000000',
        gradientColors: ['#000428', '#004e92', '#00d4ff'],
        particleColor: '#00d4ff',
        waveformColor: '#00ff88',
        spectrumColors: ['#ff0080', '#ff4000', '#ffff00', '#00ff88', '#00d4ff'],
        glowIntensity: 0.8,
        saturation: 1.0,
        brightness: 1.0,
        contrast: 1.2
      }
    },
    {
      id: 'neon-cyber',
      name: 'Neon Cyber',
      description: 'Cyberpunk aesthetic with bright neon colors',
      effects: [
        {
          type: 'lightning',
          enabled: true,
          intensity: 1.0,
          speed: 1.5,
          scale: 1.0,
          opacity: 0.8,
          beatReactive: true,
          frequencyReactive: true,
          colorCycling: false
        },
        {
          type: 'plasma',
          enabled: true,
          intensity: 0.7,
          speed: 0.8,
          scale: 1.0,
          opacity: 0.4,
          beatReactive: false,
          frequencyReactive: true,
          colorCycling: true,
          customParams: { speed: 1.5, intensity: 0.7 }
        },
        {
          type: 'tunnel',
          enabled: true,
          intensity: 0.5,
          speed: 1.0,
          scale: 0.8,
          opacity: 0.6,
          beatReactive: true,
          frequencyReactive: false,
          colorCycling: false,
          customParams: { rotationSpeed: 0.02 }
        }
      ],
      theme: {
        id: 'neon-cyber',
        name: 'Neon Cyber',
        primaryColor: '#ff00ff',
        secondaryColor: '#00ffff',
        accentColor: '#ffff00',
        backgroundColor: '#0a0a0a',
        gradientColors: ['#1a0033', '#330066', '#ff00ff'],
        particleColor: '#ff00ff',
        waveformColor: '#00ffff',
        spectrumColors: ['#ff00ff', '#ff0080', '#ff4000', '#ffff00', '#00ffff'],
        glowIntensity: 1.0,
        saturation: 1.2,
        brightness: 1.1,
        contrast: 1.3
      }
    },
    {
      id: 'retro-synthwave',
      name: 'Retro Synthwave',
      description: '80s inspired with purple and pink gradients',
      effects: [
        {
          type: 'kaleidoscope',
          enabled: true,
          intensity: 0.8,
          speed: 0.6,
          scale: 1.0,
          opacity: 0.7,
          beatReactive: true,
          frequencyReactive: true,
          colorCycling: false
        },
        {
          type: 'waveform',
          enabled: true,
          intensity: 1.0,
          speed: 1.0,
          scale: 1.2,
          opacity: 0.8,
          beatReactive: false,
          frequencyReactive: false,
          colorCycling: false
        },
        {
          type: 'ripple',
          enabled: true,
          intensity: 0.9,
          speed: 1.1,
          scale: 1.0,
          opacity: 0.6,
          beatReactive: true,
          frequencyReactive: false,
          colorCycling: false
        }
      ],
      theme: {
        id: 'retro-synthwave',
        name: 'Retro Synthwave',
        primaryColor: '#ff6ec7',
        secondaryColor: '#7928ca',
        accentColor: '#ffd700',
        backgroundColor: '#0f0f23',
        gradientColors: ['#2d1b69', '#11072c', '#ff6ec7'],
        particleColor: '#ff6ec7',
        waveformColor: '#7928ca',
        spectrumColors: ['#7928ca', '#9333ea', '#c084fc', '#e879f9', '#ff6ec7'],
        glowIntensity: 0.9,
        saturation: 0.9,
        brightness: 0.95,
        contrast: 1.1
      }
    },
    {
      id: 'minimal-pro',
      name: 'Minimal Pro',
      description: 'Clean professional look with subtle effects',
      effects: [
        {
          type: 'spectrum',
          enabled: true,
          intensity: 0.9,
          speed: 1.0,
          scale: 0.8,
          opacity: 0.9,
          beatReactive: true,
          frequencyReactive: true,
          colorCycling: false
        },
        {
          type: 'waveform',
          enabled: true,
          intensity: 0.7,
          speed: 1.0,
          scale: 1.0,
          opacity: 0.7,
          beatReactive: false,
          frequencyReactive: false,
          colorCycling: false
        },
        {
          type: 'circle',
          enabled: true,
          intensity: 0.4,
          speed: 0.8,
          scale: 0.6,
          opacity: 0.3,
          beatReactive: true,
          frequencyReactive: false,
          colorCycling: false
        }
      ],
      theme: {
        id: 'minimal-pro',
        name: 'Minimal Professional',
        primaryColor: '#3b82f6',
        secondaryColor: '#1d4ed8',
        accentColor: '#f59e0b',
        backgroundColor: '#111827',
        gradientColors: ['#1f2937', '#374151', '#3b82f6'],
        particleColor: '#3b82f6',
        waveformColor: '#10b981',
        spectrumColors: ['#3b82f6', '#1d4ed8', '#0ea5e9', '#06b6d4', '#10b981'],
        glowIntensity: 0.5,
        saturation: 0.8,
        brightness: 0.9,
        contrast: 1.0
      }
    }
  ];

  // Initialize visual engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderConfig = {
      width,
      height,
      fps: 60,
      quality: 'high' as const,
      enableWebGL: true,
      enablePostProcessing: true,
      enableBloom: true,
      enableMotionBlur: false,
      antiAliasing: true
    };

    visualEngineRef.current = new VisualEffectsEngine(canvas, renderConfig);
    
    // Apply initial preset
    const initialPreset = visualPresets.find(p => p.id === currentPreset);
    if (initialPreset) {
      applyPreset(initialPreset);
    }

    return () => {
      visualEngineRef.current?.stop();
      visualEngineRef.current = null;
    };
  }, [width, height]);

  // Initialize beat detector
  useEffect(() => {
    if (!deck) return;

    const analyzerNode = deck['analyserNode'];
    const audioContext = deck['audioContext'];
    
    if (audioContext && analyzerNode) {
      beatDetectorRef.current = new BeatDetector(audioContext, analyzerNode);
      
      beatDetectorRef.current.onBeat(setBeatInfo);
      beatDetectorRef.current.onSpectralFeatures(setSpectralFeatures);
      beatDetectorRef.current.onTransient(setTransientInfo);
      beatDetectorRef.current.onTempoChange((bpm) => {
        console.log(`Visual tempo updated: ${bpm} BPM`);
      });
    }

    return () => {
      beatDetectorRef.current?.stopDetection();
      beatDetectorRef.current = null;
    };
  }, [deck]);

  // Control visual engine based on playback state
  useEffect(() => {
    if (!deck || !visualEngineRef.current) return;

    const handlePlayStateChange = (playing: boolean) => {
      if (playing && isActive) {
        startVisuals();
      } else {
        stopVisuals();
      }
    };

    deck.onPlayStateChange?.(handlePlayStateChange);

    if (deck.isPlaying && isActive) {
      startVisuals();
    }

    return () => {
      stopVisuals();
    };
  }, [deck, isActive]);

  const startVisuals = () => {
    if (!visualEngineRef.current || !deck) return;

    beatDetectorRef.current?.startDetection();
    visualEngineRef.current.start();
    
    // Start animation loop for audio data updates
    updateAudioData();
    
    console.log('Beat-reactive visuals started');
  };

  const stopVisuals = () => {
    if (!visualEngineRef.current) return;

    beatDetectorRef.current?.stopDetection();
    visualEngineRef.current.stop();
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    console.log('Beat-reactive visuals stopped');
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

    // Update performance stats
    const stats = visualEngineRef.current.getPerformanceStats();
    setPerformanceStats(stats);

    animationRef.current = requestAnimationFrame(updateAudioData);
  };

  const applyPreset = (preset: VisualPreset) => {
    if (!visualEngineRef.current) return;

    // Clear existing effects
    visualEngineRef.current.clearEffects();
    
    // Set theme
    visualEngineRef.current.setTheme(preset.theme);
    
    // Add effects from preset
    preset.effects.forEach(effect => {
      visualEngineRef.current!.addEffect(effect);
    });
    
    console.log(`Applied visual preset: ${preset.name}`);
  };

  const handlePresetChange = (presetId: string) => {
    setCurrentPreset(presetId);
    const preset = visualPresets.find(p => p.id === presetId);
    if (preset) {
      applyPreset(preset);
    }
  };

  const handleControlChange = (key: keyof typeof visualControls, value: any) => {
    setVisualControls(prev => ({ ...prev, [key]: value }));
    
    // Apply control changes to visual engine
    if (!visualEngineRef.current) return;
    
    switch (key) {
      case 'intensity':
        visualEngineRef.current.getEffect('particles')?.intensity && 
        visualEngineRef.current.updateEffect('particles', { intensity: value });
        break;
        
      case 'speed':
        visualEngineRef.current.getEffect('particles')?.speed && 
        visualEngineRef.current.updateEffect('particles', { speed: value });
        break;
        
      case 'particleCount':
        const particleEffect = visualEngineRef.current.getEffect('particles');
        if (particleEffect?.particleConfig) {
          particleEffect.particleConfig.count = value;
        }
        break;
    }
  };

  const resetVisuals = () => {
    if (!visualEngineRef.current) return;
    
    visualEngineRef.current.clearEffects();
    beatDetectorRef.current?.reset();
    
    // Reapply current preset
    const preset = visualPresets.find(p => p.id === currentPreset);
    if (preset) {
      applyPreset(preset);
    }
  };

  const toggleActive = () => {
    setIsActive(!isActive);
    if (!isActive && deck?.isPlaying) {
      startVisuals();
    } else {
      stopVisuals();
    }
  };

  return (
    <div className={`beat-reactive-visuals ${className}`}>
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Beat-Reactive Visuals</h3>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Beat info display */}
              {beatInfo && isActive && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-gray-300">{beatInfo.bpm.toFixed(0)} BPM</span>
                  <div className="w-16 bg-gray-700 rounded-full h-1">
                    <div 
                      className="bg-red-500 h-1 rounded-full transition-all duration-100"
                      style={{ width: `${beatInfo.beatPhase * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              <Button
                variant={isActive ? "default" : "secondary"}
                size="sm"
                onClick={toggleActive}
                data-testid="button-visuals-toggle"
              >
                {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={resetVisuals}
                data-testid="button-visuals-reset"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                data-testid="button-visuals-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Visual Canvas */}
          <div className="relative bg-black rounded-lg overflow-hidden mb-4">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="block w-full h-auto"
              style={{ aspectRatio: `${width}/${height}` }}
              data-testid="canvas-beat-reactive-visuals"
            />
            
            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Click play to start beat-reactive visuals</p>
                </div>
              </div>
            )}
            
            {/* Beat indicators overlay */}
            {beatInfo?.isBeat && isActive && visualControls.showBeatIndicators && (
              <div className="absolute top-4 left-4 flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                <div className="text-white text-sm font-mono">BEAT</div>
              </div>
            )}
          </div>

          {/* Preset Selection */}
          <div className="flex items-center space-x-4 mb-4">
            <label className="text-sm text-gray-300 font-medium">Preset:</label>
            <select
              value={currentPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
              data-testid="select-visual-preset"
            >
              {visualPresets.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            
            <div className="text-xs text-gray-500">
              {visualPresets.find(p => p.id === currentPreset)?.description}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>FPS: {performanceStats.fps.toFixed(1)}</span>
            <span>Particles: {performanceStats.particleCount}</span>
            <span>Effects: {performanceStats.effectCount}</span>
            <span>Processing: {performanceStats.processingTime.toFixed(1)}ms</span>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings Panel */}
      {showSettings && (
        <Card className="mt-4 bg-gray-800 border-gray-600">
          <CardContent className="p-4 space-y-6">
            <h4 className="font-semibold text-white flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Visual Controls</span>
            </h4>
            
            {/* Intensity and Speed */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Intensity: {visualControls.intensity.toFixed(1)}
                </label>
                <Slider
                  value={[visualControls.intensity]}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  onValueChange={([value]) => handleControlChange('intensity', value)}
                  data-testid="slider-visual-intensity"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Speed: {visualControls.speed.toFixed(1)}x
                </label>
                <Slider
                  value={[visualControls.speed]}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  onValueChange={([value]) => handleControlChange('speed', value)}
                  data-testid="slider-visual-speed"
                />
              </div>
            </div>

            {/* Sensitivity and Particle Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Sensitivity: {visualControls.sensitivity.toFixed(1)}
                </label>
                <Slider
                  value={[visualControls.sensitivity]}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  onValueChange={([value]) => handleControlChange('sensitivity', value)}
                  data-testid="slider-visual-sensitivity"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Particles: {visualControls.particleCount}
                </label>
                <Slider
                  value={[visualControls.particleCount]}
                  min={10}
                  max={500}
                  step={10}
                  onValueChange={([value]) => handleControlChange('particleCount', value)}
                  data-testid="slider-visual-particles"
                />
              </div>
            </div>

            {/* Glow Intensity */}
            <div>
              <label className="text-sm text-gray-300 mb-2 block">
                Glow Intensity: {visualControls.glowIntensity.toFixed(1)}
              </label>
              <Slider
                value={[visualControls.glowIntensity]}
                min={0}
                max={2.0}
                step={0.1}
                onValueChange={([value]) => handleControlChange('glowIntensity', value)}
                data-testid="slider-visual-glow"
              />
            </div>

            {/* Feature Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={visualControls.beatReactive}
                  onCheckedChange={(checked) => handleControlChange('beatReactive', checked)}
                  data-testid="switch-beat-reactive"
                />
                <label className="text-sm text-gray-300">Beat Reactive</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={visualControls.colorCycling}
                  onCheckedChange={(checked) => handleControlChange('colorCycling', checked)}
                  data-testid="switch-color-cycling"
                />
                <label className="text-sm text-gray-300">Color Cycling</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={visualControls.showBeatIndicators}
                  onCheckedChange={(checked) => handleControlChange('showBeatIndicators', checked)}
                  data-testid="switch-beat-indicators"
                />
                <label className="text-sm text-gray-300">Beat Indicators</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={visualControls.showEnergyFlow}
                  onCheckedChange={(checked) => handleControlChange('showEnergyFlow', checked)}
                  data-testid="switch-energy-flow"
                />
                <label className="text-sm text-gray-300">Energy Flow</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={visualControls.showFrequencyBands}
                  onCheckedChange={(checked) => handleControlChange('showFrequencyBands', checked)}
                  data-testid="switch-frequency-bands"
                />
                <label className="text-sm text-gray-300">Frequency Bands</label>
              </div>
            </div>

            {/* Preset Actions */}
            <div className="pt-4 border-t border-gray-700">
              <h5 className="text-sm font-medium text-gray-300 mb-3">Preset Actions</h5>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  data-testid="button-save-preset"
                >
                  <Palette className="w-4 h-4 mr-1" />
                  Save Preset
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  data-testid="button-export-settings"
                >
                  Export Settings
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  data-testid="button-fullscreen-visuals"
                >
                  <Maximize2 className="w-4 h-4 mr-1" />
                  Fullscreen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}