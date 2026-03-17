import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Sliders, 
  Zap, 
  Monitor, 
  Save, 
  Upload, 
  RotateCcw, 
  Eye,
  Settings2,
  Paintbrush,
  Gauge,
  Sparkles,
  Volume2
} from 'lucide-react';

interface VisualizationControlsProps {
  onSettingsChange: (category: string, settings: any) => void;
  currentSettings: VisualizationSettings;
  className?: string;
}

interface VisualizationSettings {
  theme: {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    colorMode: 'gradient' | 'frequency' | 'energy' | 'beat';
    saturation: number;
    brightness: number;
    contrast: number;
  };
  effects: {
    particles: {
      enabled: boolean;
      count: number;
      size: number;
      speed: number;
      life: number;
      shape: 'circle' | 'square' | 'triangle' | 'star' | 'diamond';
      blendMode: 'normal' | 'screen' | 'multiply' | 'overlay';
      trail: boolean;
      trailLength: number;
    };
    waveform: {
      enabled: boolean;
      style: 'line' | 'filled' | 'mirror' | 'radial';
      thickness: number;
      smoothing: number;
      colorMode: 'solid' | 'gradient' | 'frequency';
      beatPulse: boolean;
    };
    spectrum: {
      enabled: boolean;
      bars: number;
      logScale: boolean;
      peakHold: boolean;
      smoothing: number;
      colorMode: 'gradient' | 'frequency' | 'energy';
      beatReactive: boolean;
    };
    visual3d: {
      enabled: boolean;
      type: 'tunnel' | 'plasma' | 'kaleidoscope' | 'lightning';
      intensity: number;
      speed: number;
      rotation: boolean;
      morphing: boolean;
    };
  };
  performance: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    targetFps: number;
    enableWebGL: boolean;
    enablePostProcessing: boolean;
    enableMotionBlur: boolean;
    enableBloom: boolean;
    antiAliasing: boolean;
  };
  reactivity: {
    beatSensitivity: number;
    frequencySensitivity: number;
    energyThreshold: number;
    beatPrediction: boolean;
    autoAdjust: boolean;
    transientDetection: boolean;
    keySync: boolean;
  };
  display: {
    showBeatIndicator: boolean;
    showBpmCounter: boolean;
    showFrequencyBands: boolean;
    showEnergyMeter: boolean;
    showPerformanceStats: boolean;
    fullScreenMode: boolean;
    multiMonitor: boolean;
  };
}

const COLOR_THEMES = [
  {
    name: 'Dark Club',
    id: 'dark-club',
    primary: '#00d4ff',
    secondary: '#ff0080',
    accent: '#ffff00',
    background: '#000000'
  },
  {
    name: 'Neon Cyber',
    id: 'neon-cyber',
    primary: '#ff00ff',
    secondary: '#00ffff',
    accent: '#ffff00',
    background: '#0a0a0a'
  },
  {
    name: 'Retro Synthwave',
    id: 'retro-synthwave',
    primary: '#ff6ec7',
    secondary: '#7928ca',
    accent: '#ffd700',
    background: '#0f0f23'
  },
  {
    name: 'Minimal Pro',
    id: 'minimal-pro',
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    accent: '#f59e0b',
    background: '#111827'
  },
  {
    name: 'Warm Sunset',
    id: 'warm-sunset',
    primary: '#ff6b35',
    secondary: '#f7931e',
    accent: '#ffcd3c',
    background: '#1a1a2e'
  },
  {
    name: 'Cool Ocean',
    id: 'cool-ocean',
    primary: '#0077be',
    secondary: '#00a8cc',
    accent: '#00c9cc',
    background: '#001122'
  }
];

export default function VisualizationControls({
  onSettingsChange,
  currentSettings,
  className = ''
}: VisualizationControlsProps) {
  const [activeTab, setActiveTab] = useState<string>('theme');
  const [presetName, setPresetName] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  // Auto-save settings
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Performance monitoring
  const [performanceScore, setPerformanceScore] = useState<number>(85);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (autoSave) {
      const timer = setTimeout(() => {
        saveSettings();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentSettings, autoSave]);

  const saveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('dj-visual-settings', JSON.stringify(currentSettings));
    setLastSaved(new Date());
  };

  const loadSettings = () => {
    const saved = localStorage.getItem('dj-visual-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        Object.keys(settings).forEach(category => {
          onSettingsChange(category, settings[category]);
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  };

  const resetSettings = () => {
    // Reset to defaults
    const defaultSettings: VisualizationSettings = {
      theme: {
        name: 'Dark Club',
        primaryColor: '#00d4ff',
        secondaryColor: '#ff0080',
        accentColor: '#ffff00',
        backgroundColor: '#000000',
        colorMode: 'gradient',
        saturation: 1.0,
        brightness: 1.0,
        contrast: 1.0
      },
      effects: {
        particles: {
          enabled: true,
          count: 100,
          size: 3,
          speed: 2,
          life: 180,
          shape: 'circle',
          blendMode: 'screen',
          trail: true,
          trailLength: 15
        },
        waveform: {
          enabled: true,
          style: 'line',
          thickness: 2,
          smoothing: 0.3,
          colorMode: 'gradient',
          beatPulse: true
        },
        spectrum: {
          enabled: true,
          bars: 128,
          logScale: true,
          peakHold: true,
          smoothing: 0.3,
          colorMode: 'gradient',
          beatReactive: true
        },
        visual3d: {
          enabled: false,
          type: 'tunnel',
          intensity: 0.8,
          speed: 1.0,
          rotation: true,
          morphing: false
        }
      },
      performance: {
        quality: 'high',
        targetFps: 60,
        enableWebGL: true,
        enablePostProcessing: true,
        enableMotionBlur: false,
        enableBloom: true,
        antiAliasing: true
      },
      reactivity: {
        beatSensitivity: 0.8,
        frequencySensitivity: 0.7,
        energyThreshold: 0.3,
        beatPrediction: true,
        autoAdjust: true,
        transientDetection: true,
        keySync: false
      },
      display: {
        showBeatIndicator: true,
        showBpmCounter: true,
        showFrequencyBands: true,
        showEnergyMeter: false,
        showPerformanceStats: false,
        fullScreenMode: false,
        multiMonitor: false
      }
    };

    Object.keys(defaultSettings).forEach(category => {
      onSettingsChange(category, defaultSettings[category as keyof VisualizationSettings]);
    });
  };

  const applyTheme = (themeId: string) => {
    const theme = COLOR_THEMES.find(t => t.id === themeId);
    if (theme) {
      onSettingsChange('theme', {
        ...currentSettings.theme,
        name: theme.name,
        primaryColor: theme.primary,
        secondaryColor: theme.secondary,
        accentColor: theme.accent,
        backgroundColor: theme.background
      });
    }
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(currentSettings, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dj-visuals-${presetName || 'preset'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target?.result as string);
          Object.keys(settings).forEach(category => {
            onSettingsChange(category, settings[category]);
          });
        } catch (error) {
          console.error('Failed to import settings:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className={`visualization-controls ${className}`}>
      <Card className="glass-panel neon-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings2 className="w-5 h-5 text-cyan-400" />
              <span>Visualization Controls</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Performance Score */}
              <Badge 
                variant={performanceScore > 80 ? "default" : performanceScore > 60 ? "secondary" : "destructive"}
                className="text-xs"
              >
                <Gauge className="w-3 h-3 mr-1" />
                {performanceScore}%
              </Badge>
              
              {/* Auto-save indicator */}
              <div className="flex items-center space-x-1">
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                  data-testid="switch-auto-save"
                />
                <span className="text-xs text-white/40">Auto-save</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 bg-black/30">
              <TabsTrigger value="theme" className="text-xs">
                <Palette className="w-4 h-4 mr-1" />
                Theme
              </TabsTrigger>
              <TabsTrigger value="effects" className="text-xs">
                <Sparkles className="w-4 h-4 mr-1" />
                Effects
              </TabsTrigger>
              <TabsTrigger value="reactivity" className="text-xs">
                <Zap className="w-4 h-4 mr-1" />
                React
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">
                <Monitor className="w-4 h-4 mr-1" />
                Quality
              </TabsTrigger>
              <TabsTrigger value="display" className="text-xs">
                <Eye className="w-4 h-4 mr-1" />
                Display
              </TabsTrigger>
            </TabsList>

            {/* Theme Controls */}
            <TabsContent value="theme" className="space-y-6">
              {/* Color Theme Selection */}
              <div>
                <label className="text-sm font-medium text-white/60 mb-3 block">Color Themes</label>
                <div className="grid grid-cols-2 gap-3">
                  {COLOR_THEMES.map(theme => (
                    <Button
                      key={theme.id}
                      variant={currentSettings.theme.name === theme.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => applyTheme(theme.id)}
                      className="justify-start h-12"
                      data-testid={`button-theme-${theme.id}`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.secondary }} />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                        </div>
                        <span className="text-xs">{theme.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={currentSettings.theme.primaryColor}
                      onChange={(e) => onSettingsChange('theme', {
                        ...currentSettings.theme,
                        primaryColor: e.target.value
                      })}
                      className="w-8 h-8 rounded border-2 border-white/10"
                      data-testid="input-primary-color"
                    />
                    <input
                      type="text"
                      value={currentSettings.theme.primaryColor}
                      onChange={(e) => onSettingsChange('theme', {
                        ...currentSettings.theme,
                        primaryColor: e.target.value
                      })}
                      className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                      data-testid="input-primary-color-hex"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">Secondary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={currentSettings.theme.secondaryColor}
                      onChange={(e) => onSettingsChange('theme', {
                        ...currentSettings.theme,
                        secondaryColor: e.target.value
                      })}
                      className="w-8 h-8 rounded border-2 border-white/10"
                      data-testid="input-secondary-color"
                    />
                    <input
                      type="text"
                      value={currentSettings.theme.secondaryColor}
                      onChange={(e) => onSettingsChange('theme', {
                        ...currentSettings.theme,
                        secondaryColor: e.target.value
                      })}
                      className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                      data-testid="input-secondary-color-hex"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">Accent Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={currentSettings.theme.accentColor}
                      onChange={(e) => onSettingsChange('theme', {
                        ...currentSettings.theme,
                        accentColor: e.target.value
                      })}
                      className="w-8 h-8 rounded border-2 border-white/10"
                      data-testid="input-accent-color"
                    />
                    <input
                      type="text"
                      value={currentSettings.theme.accentColor}
                      onChange={(e) => onSettingsChange('theme', {
                        ...currentSettings.theme,
                        accentColor: e.target.value
                      })}
                      className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                      data-testid="input-accent-color-hex"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">Background</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={currentSettings.theme.backgroundColor}
                      onChange={(e) => onSettingsChange('theme', {
                        ...currentSettings.theme,
                        backgroundColor: e.target.value
                      })}
                      className="w-8 h-8 rounded border-2 border-white/10"
                      data-testid="input-background-color"
                    />
                    <input
                      type="text"
                      value={currentSettings.theme.backgroundColor}
                      onChange={(e) => onSettingsChange('theme', {
                        ...currentSettings.theme,
                        backgroundColor: e.target.value
                      })}
                      className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white"
                      data-testid="input-background-color-hex"
                    />
                  </div>
                </div>
              </div>

              {/* Color Properties */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Saturation: {currentSettings.theme.saturation.toFixed(1)}
                  </label>
                  <Slider
                    value={[currentSettings.theme.saturation]}
                    min={0}
                    max={2}
                    step={0.1}
                    onValueChange={([value]) => onSettingsChange('theme', {
                      ...currentSettings.theme,
                      saturation: value
                    })}
                    data-testid="slider-saturation"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Brightness: {currentSettings.theme.brightness.toFixed(1)}
                  </label>
                  <Slider
                    value={[currentSettings.theme.brightness]}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onValueChange={([value]) => onSettingsChange('theme', {
                      ...currentSettings.theme,
                      brightness: value
                    })}
                    data-testid="slider-brightness"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Contrast: {currentSettings.theme.contrast.toFixed(1)}
                  </label>
                  <Slider
                    value={[currentSettings.theme.contrast]}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onValueChange={([value]) => onSettingsChange('theme', {
                      ...currentSettings.theme,
                      contrast: value
                    })}
                    data-testid="slider-contrast"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Effects Controls */}
            <TabsContent value="effects" className="space-y-6">
              {/* Particles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white/60">Particle System</h4>
                  <Switch
                    checked={currentSettings.effects.particles.enabled}
                    onCheckedChange={(checked) => onSettingsChange('effects', {
                      ...currentSettings.effects,
                      particles: { ...currentSettings.effects.particles, enabled: checked }
                    })}
                    data-testid="switch-particles-enabled"
                  />
                </div>
                
                {currentSettings.effects.particles.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-white/5">
                    <div>
                      <label className="text-sm text-white/40 mb-1 block">
                        Count: {currentSettings.effects.particles.count}
                      </label>
                      <Slider
                        value={[currentSettings.effects.particles.count]}
                        min={10}
                        max={500}
                        step={10}
                        onValueChange={([value]) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          particles: { ...currentSettings.effects.particles, count: value }
                        })}
                        data-testid="slider-particle-count"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-white/40 mb-1 block">
                        Size: {currentSettings.effects.particles.size}
                      </label>
                      <Slider
                        value={[currentSettings.effects.particles.size]}
                        min={1}
                        max={10}
                        step={0.5}
                        onValueChange={([value]) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          particles: { ...currentSettings.effects.particles, size: value }
                        })}
                        data-testid="slider-particle-size"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-white/40 mb-1 block">
                        Speed: {currentSettings.effects.particles.speed}
                      </label>
                      <Slider
                        value={[currentSettings.effects.particles.speed]}
                        min={0.1}
                        max={10}
                        step={0.1}
                        onValueChange={([value]) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          particles: { ...currentSettings.effects.particles, speed: value }
                        })}
                        data-testid="slider-particle-speed"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-white/40 mb-1 block">Shape</label>
                      <Select
                        value={currentSettings.effects.particles.shape}
                        onValueChange={(value) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          particles: { ...currentSettings.effects.particles, shape: value as any }
                        })}
                      >
                        <SelectTrigger className="bg-black/30 border-white/10" data-testid="select-particle-shape">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/30 border-white/10">
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="triangle">Triangle</SelectItem>
                          <SelectItem value="star">Star</SelectItem>
                          <SelectItem value="diamond">Diamond</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Spectrum Analyzer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white/60">Spectrum Analyzer</h4>
                  <Switch
                    checked={currentSettings.effects.spectrum.enabled}
                    onCheckedChange={(checked) => onSettingsChange('effects', {
                      ...currentSettings.effects,
                      spectrum: { ...currentSettings.effects.spectrum, enabled: checked }
                    })}
                    data-testid="switch-spectrum-enabled"
                  />
                </div>
                
                {currentSettings.effects.spectrum.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-white/5">
                    <div>
                      <label className="text-sm text-white/40 mb-1 block">
                        Bars: {currentSettings.effects.spectrum.bars}
                      </label>
                      <Slider
                        value={[currentSettings.effects.spectrum.bars]}
                        min={32}
                        max={512}
                        step={16}
                        onValueChange={([value]) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          spectrum: { ...currentSettings.effects.spectrum, bars: value }
                        })}
                        data-testid="slider-spectrum-bars"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-white/40 mb-1 block">
                        Smoothing: {currentSettings.effects.spectrum.smoothing.toFixed(1)}
                      </label>
                      <Slider
                        value={[currentSettings.effects.spectrum.smoothing]}
                        min={0}
                        max={1}
                        step={0.1}
                        onValueChange={([value]) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          spectrum: { ...currentSettings.effects.spectrum, smoothing: value }
                        })}
                        data-testid="slider-spectrum-smoothing"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={currentSettings.effects.spectrum.logScale}
                        onCheckedChange={(checked) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          spectrum: { ...currentSettings.effects.spectrum, logScale: checked }
                        })}
                        data-testid="switch-spectrum-log-scale"
                      />
                      <label className="text-sm text-white/40">Log Scale</label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={currentSettings.effects.spectrum.peakHold}
                        onCheckedChange={(checked) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          spectrum: { ...currentSettings.effects.spectrum, peakHold: checked }
                        })}
                        data-testid="switch-spectrum-peak-hold"
                      />
                      <label className="text-sm text-white/40">Peak Hold</label>
                    </div>
                  </div>
                )}
              </div>

              {/* 3D Visual Effects */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white/60">3D Effects</h4>
                  <Switch
                    checked={currentSettings.effects.visual3d.enabled}
                    onCheckedChange={(checked) => onSettingsChange('effects', {
                      ...currentSettings.effects,
                      visual3d: { ...currentSettings.effects.visual3d, enabled: checked }
                    })}
                    data-testid="switch-3d-enabled"
                  />
                </div>
                
                {currentSettings.effects.visual3d.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-white/5">
                    <div>
                      <label className="text-sm text-white/40 mb-1 block">Type</label>
                      <Select
                        value={currentSettings.effects.visual3d.type}
                        onValueChange={(value) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          visual3d: { ...currentSettings.effects.visual3d, type: value as any }
                        })}
                      >
                        <SelectTrigger className="bg-black/30 border-white/10" data-testid="select-3d-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/30 border-white/10">
                          <SelectItem value="tunnel">Tunnel</SelectItem>
                          <SelectItem value="plasma">Plasma</SelectItem>
                          <SelectItem value="kaleidoscope">Kaleidoscope</SelectItem>
                          <SelectItem value="lightning">Lightning</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm text-white/40 mb-1 block">
                        Intensity: {currentSettings.effects.visual3d.intensity.toFixed(1)}
                      </label>
                      <Slider
                        value={[currentSettings.effects.visual3d.intensity]}
                        min={0.1}
                        max={2}
                        step={0.1}
                        onValueChange={([value]) => onSettingsChange('effects', {
                          ...currentSettings.effects,
                          visual3d: { ...currentSettings.effects.visual3d, intensity: value }
                        })}
                        data-testid="slider-3d-intensity"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Reactivity Controls */}
            <TabsContent value="reactivity" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Beat Sensitivity: {currentSettings.reactivity.beatSensitivity.toFixed(1)}
                  </label>
                  <Slider
                    value={[currentSettings.reactivity.beatSensitivity]}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onValueChange={([value]) => onSettingsChange('reactivity', {
                      ...currentSettings.reactivity,
                      beatSensitivity: value
                    })}
                    data-testid="slider-beat-sensitivity"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Frequency Sensitivity: {currentSettings.reactivity.frequencySensitivity.toFixed(1)}
                  </label>
                  <Slider
                    value={[currentSettings.reactivity.frequencySensitivity]}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onValueChange={([value]) => onSettingsChange('reactivity', {
                      ...currentSettings.reactivity,
                      frequencySensitivity: value
                    })}
                    data-testid="slider-frequency-sensitivity"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Energy Threshold: {currentSettings.reactivity.energyThreshold.toFixed(1)}
                  </label>
                  <Slider
                    value={[currentSettings.reactivity.energyThreshold]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={([value]) => onSettingsChange('reactivity', {
                      ...currentSettings.reactivity,
                      energyThreshold: value
                    })}
                    data-testid="slider-energy-threshold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.reactivity.beatPrediction}
                    onCheckedChange={(checked) => onSettingsChange('reactivity', {
                      ...currentSettings.reactivity,
                      beatPrediction: checked
                    })}
                    data-testid="switch-beat-prediction"
                  />
                  <label className="text-sm text-white/60">Beat Prediction</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.reactivity.autoAdjust}
                    onCheckedChange={(checked) => onSettingsChange('reactivity', {
                      ...currentSettings.reactivity,
                      autoAdjust: checked
                    })}
                    data-testid="switch-auto-adjust"
                  />
                  <label className="text-sm text-white/60">Auto Adjust</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.reactivity.transientDetection}
                    onCheckedChange={(checked) => onSettingsChange('reactivity', {
                      ...currentSettings.reactivity,
                      transientDetection: checked
                    })}
                    data-testid="switch-transient-detection"
                  />
                  <label className="text-sm text-white/60">Transient Detection</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.reactivity.keySync}
                    onCheckedChange={(checked) => onSettingsChange('reactivity', {
                      ...currentSettings.reactivity,
                      keySync: checked
                    })}
                    data-testid="switch-key-sync"
                  />
                  <label className="text-sm text-white/60">Key Sync</label>
                </div>
              </div>
            </TabsContent>

            {/* Performance Controls */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Quality</label>
                  <Select
                    value={currentSettings.performance.quality}
                    onValueChange={(value) => onSettingsChange('performance', {
                      ...currentSettings.performance,
                      quality: value as any
                    })}
                  >
                    <SelectTrigger className="bg-black/30 border-white/10" data-testid="select-quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/30 border-white/10">
                      <SelectItem value="low">Low (Better Performance)</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="ultra">Ultra (Best Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Target FPS: {currentSettings.performance.targetFps}
                  </label>
                  <Slider
                    value={[currentSettings.performance.targetFps]}
                    min={30}
                    max={120}
                    step={10}
                    onValueChange={([value]) => onSettingsChange('performance', {
                      ...currentSettings.performance,
                      targetFps: value
                    })}
                    data-testid="slider-target-fps"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.performance.enableWebGL}
                    onCheckedChange={(checked) => onSettingsChange('performance', {
                      ...currentSettings.performance,
                      enableWebGL: checked
                    })}
                    data-testid="switch-webgl"
                  />
                  <label className="text-sm text-white/60">WebGL</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.performance.enablePostProcessing}
                    onCheckedChange={(checked) => onSettingsChange('performance', {
                      ...currentSettings.performance,
                      enablePostProcessing: checked
                    })}
                    data-testid="switch-post-processing"
                  />
                  <label className="text-sm text-white/60">Post Processing</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.performance.enableBloom}
                    onCheckedChange={(checked) => onSettingsChange('performance', {
                      ...currentSettings.performance,
                      enableBloom: checked
                    })}
                    data-testid="switch-bloom"
                  />
                  <label className="text-sm text-white/60">Bloom Effect</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.performance.antiAliasing}
                    onCheckedChange={(checked) => onSettingsChange('performance', {
                      ...currentSettings.performance,
                      antiAliasing: checked
                    })}
                    data-testid="switch-antialiasing"
                  />
                  <label className="text-sm text-white/60">Anti-Aliasing</label>
                </div>
              </div>

              {/* Performance Optimization Suggestions */}
              {optimizationSuggestions.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-yellow-400 mb-2">Optimization Suggestions</h5>
                  <ul className="text-xs text-yellow-300 space-y-1">
                    {optimizationSuggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            {/* Display Controls */}
            <TabsContent value="display" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.display.showBeatIndicator}
                    onCheckedChange={(checked) => onSettingsChange('display', {
                      ...currentSettings.display,
                      showBeatIndicator: checked
                    })}
                    data-testid="switch-beat-indicator"
                  />
                  <label className="text-sm text-white/60">Beat Indicator</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.display.showBpmCounter}
                    onCheckedChange={(checked) => onSettingsChange('display', {
                      ...currentSettings.display,
                      showBpmCounter: checked
                    })}
                    data-testid="switch-bpm-counter"
                  />
                  <label className="text-sm text-white/60">BPM Counter</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.display.showFrequencyBands}
                    onCheckedChange={(checked) => onSettingsChange('display', {
                      ...currentSettings.display,
                      showFrequencyBands: checked
                    })}
                    data-testid="switch-frequency-bands"
                  />
                  <label className="text-sm text-white/60">Frequency Bands</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.display.showEnergyMeter}
                    onCheckedChange={(checked) => onSettingsChange('display', {
                      ...currentSettings.display,
                      showEnergyMeter: checked
                    })}
                    data-testid="switch-energy-meter"
                  />
                  <label className="text-sm text-white/60">Energy Meter</label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentSettings.display.showPerformanceStats}
                    onCheckedChange={(checked) => onSettingsChange('display', {
                      ...currentSettings.display,
                      showPerformanceStats: checked
                    })}
                    data-testid="switch-performance-stats"
                  />
                  <label className="text-sm text-white/60">Performance Stats</label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Preset Management */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <h4 className="font-medium text-white/60 mb-4">Preset Management</h4>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name..."
                className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
                data-testid="input-preset-name"
              />
              <Button size="sm" onClick={saveSettings} data-testid="button-save-preset">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={exportSettings} data-testid="button-export-settings">
                Export Settings
              </Button>
              <Button size="sm" variant="outline" onClick={() => document.getElementById('import-settings')?.click()} data-testid="button-import-settings">
                <Upload className="w-4 h-4 mr-1" />
                Import Settings
              </Button>
              <input
                id="import-settings"
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
              <Button size="sm" variant="outline" onClick={loadSettings} data-testid="button-load-settings">
                Load Saved
              </Button>
              <Button size="sm" variant="destructive" onClick={resetSettings} data-testid="button-reset-settings">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
            
            {lastSaved && (
              <div className="text-xs text-white/30 mt-2">
                Last saved: {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}