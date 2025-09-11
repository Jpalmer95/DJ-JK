import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { DJDeck } from '@/lib/djAudio';
import { BeatDetector, BeatInfo, SpectralFeatures } from '@/lib/beatDetection';
import { Settings, Maximize2, Minimize2, Activity, BarChart3 } from 'lucide-react';

interface SpectrumAnalyzerProps {
  deck: DJDeck;
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
  enableBeatDetection?: boolean;
  theme?: 'dark' | 'neon' | 'retro';
}

interface SpectrumConfig {
  sensitivity: number;
  smoothing: number;
  logScale: boolean;
  showPeaks: boolean;
  showWaterfall: boolean;
  barCount: number;
  colorMode: 'gradient' | 'frequency' | 'energy';
  beatReactive: boolean;
}

interface FrequencyBand {
  name: string;
  range: [number, number];
  color: string;
  energy: number;
  peak: number;
  peakHold: number;
}

export default function SpectrumAnalyzer({
  deck,
  width = 600,
  height = 300,
  className = '',
  showControls = true,
  enableBeatDetection = true,
  theme = 'dark'
}: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterfallCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const beatDetectorRef = useRef<BeatDetector | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [beatInfo, setBeatInfo] = useState<BeatInfo | null>(null);
  const [spectralFeatures, setSpectralFeatures] = useState<SpectralFeatures | null>(null);
  
  // Configuration state
  const [config, setConfig] = useState<SpectrumConfig>({
    sensitivity: 1.0,
    smoothing: 0.3,
    logScale: true,
    showPeaks: true,
    showWaterfall: false,
    barCount: 128,
    colorMode: 'gradient',
    beatReactive: true
  });

  // Frequency bands for multi-band analysis
  const [frequencyBands] = useState<FrequencyBand[]>([
    { name: 'Sub Bass', range: [20, 60], color: '#ff0040', energy: 0, peak: 0, peakHold: 0 },
    { name: 'Bass', range: [60, 250], color: '#ff4000', energy: 0, peak: 0, peakHold: 0 },
    { name: 'Low Mid', range: [250, 500], color: '#ff8000', energy: 0, peak: 0, peakHold: 0 },
    { name: 'Mid', range: [500, 2000], color: '#ffff00', energy: 0, peak: 0, peakHold: 0 },
    { name: 'High Mid', range: [2000, 4000], color: '#80ff00', energy: 0, peak: 0, peakHold: 0 },
    { name: 'Presence', range: [4000, 6000], color: '#00ff40', energy: 0, peak: 0, peakHold: 0 },
    { name: 'Brilliance', range: [6000, 20000], color: '#00ffff', energy: 0, peak: 0, peakHold: 0 },
  ]);
  
  // Performance metrics
  const [performanceStats] = useState({
    fps: 60,
    processingTime: 0,
    averageLatency: 0
  });

  // Waterfall display data
  const waterfallData = useRef<number[][]>([]);
  const peakHolds = useRef<number[]>([]);
  const peakHoldTimers = useRef<number[]>([]);

  const themes = {
    dark: {
      background: '#000000',
      gradient: ['#001122', '#003366', '#0066cc', '#00aaff'],
      grid: '#333333',
      text: '#ffffff',
      peak: '#ffff00',
      beat: '#ff0040'
    },
    neon: {
      background: '#0a0a0a',
      gradient: ['#ff00ff', '#ff0080', '#ff4000', '#ffff00', '#00ffff'],
      grid: '#330066',
      text: '#ffffff',
      peak: '#ffff00',
      beat: '#ff00ff'
    },
    retro: {
      background: '#0f0f23',
      gradient: ['#7928ca', '#9333ea', '#c084fc', '#e879f9', '#ff6ec7'],
      grid: '#2d1b69',
      text: '#ffffff',
      peak: '#ffd700',
      beat: '#ff6ec7'
    }
  };

  const currentTheme = themes[theme];

  // Initialize beat detector when deck changes
  useEffect(() => {
    if (!deck || !enableBeatDetection) return;

    const analyzerNode = deck.getFrequencyData ? deck['analyserNode'] : null;
    if (!analyzerNode) return;

    // Create beat detector
    const audioContext = deck['audioContext'];
    if (audioContext && analyzerNode) {
      beatDetectorRef.current = new BeatDetector(audioContext, analyzerNode);
      
      // Set up callbacks
      beatDetectorRef.current.onBeat((beat) => setBeatInfo(beat));
      beatDetectorRef.current.onSpectralFeatures((features) => setSpectralFeatures(features));
      beatDetectorRef.current.onTempoChange((bpm) => {
        console.log(`Detected BPM: ${bpm}`);
      });
    }

    return () => {
      beatDetectorRef.current?.stopDetection();
      beatDetectorRef.current = null;
    };
  }, [deck, enableBeatDetection]);

  // Start/stop analysis based on deck playback state
  useEffect(() => {
    if (!deck) return;

    const handlePlayStateChange = (playing: boolean) => {
      if (playing && !isAnalyzing) {
        startAnalysis();
      } else if (!playing && isAnalyzing) {
        stopAnalysis();
      }
    };

    // Listen for deck state changes
    deck.onPlayStateChange?.(handlePlayStateChange);

    // Initialize if deck is already playing
    if (deck.isPlaying) {
      startAnalysis();
    }

    return () => {
      stopAnalysis();
    };
  }, [deck, isAnalyzing]);

  const startAnalysis = useCallback(() => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    beatDetectorRef.current?.startDetection();
    
    // Initialize peak hold arrays
    peakHolds.current = new Array(config.barCount).fill(0);
    peakHoldTimers.current = new Array(config.barCount).fill(0);
    
    console.log('Spectrum analysis started');
    renderFrame();
  }, [isAnalyzing, config.barCount]);

  const stopAnalysis = useCallback(() => {
    if (!isAnalyzing) return;
    
    setIsAnalyzing(false);
    beatDetectorRef.current?.stopDetection();
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    console.log('Spectrum analysis stopped');
  }, [isAnalyzing]);

  const renderFrame = useCallback(() => {
    if (!isAnalyzing) return;

    const canvas = canvasRef.current;
    const waterfallCanvas = waterfallCanvasRef.current;
    
    if (canvas && deck) {
      renderSpectrum(canvas);
    }
    
    if (waterfallCanvas && config.showWaterfall) {
      renderWaterfall(waterfallCanvas);
    }

    animationRef.current = requestAnimationFrame(renderFrame);
  }, [isAnalyzing, deck, config]);

  const renderSpectrum = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !deck) return;

    // Get frequency data
    const frequencyData = deck.getFrequencyData();
    if (!frequencyData || frequencyData.length === 0) return;

    // Setup canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = currentTheme.background;
    ctx.fillRect(0, 0, width, height);

    // Draw spectrum
    drawSpectrumBars(ctx, frequencyData);
    
    // Draw frequency band meters
    drawFrequencyBands(ctx, frequencyData);
    
    // Draw peak holds
    if (config.showPeaks) {
      drawPeakHolds(ctx);
    }
    
    // Draw beat indicators
    if (beatInfo?.isBeat && config.beatReactive) {
      drawBeatIndicator(ctx);
    }
    
    // Draw grid and labels
    drawGrid(ctx);
    drawFrequencyLabels(ctx);
    
    // Update frequency bands
    updateFrequencyBandEnergy(frequencyData);
  };

  const drawSpectrumBars = (ctx: CanvasRenderingContext2D, frequencyData: Uint8Array) => {
    const barWidth = width / config.barCount;
    const maxHeight = height - 60; // Leave space for labels
    
    // Apply smoothing
    const smoothedData = applySmoothing(frequencyData);
    
    for (let i = 0; i < config.barCount; i++) {
      const dataIndex = Math.floor((i / config.barCount) * smoothedData.length);
      let barHeight = (smoothedData[dataIndex] / 255) * config.sensitivity * maxHeight;
      
      // Apply logarithmic scaling if enabled
      if (config.logScale) {
        barHeight = Math.log10(1 + barHeight * 9) / Math.log10(10) * maxHeight;
      }
      
      const x = i * barWidth;
      const y = height - barHeight - 30;
      
      // Get color based on mode
      const color = getBarColor(i, barHeight, maxHeight);
      
      // Beat reactivity
      if (config.beatReactive && beatInfo?.isBeat) {
        barHeight *= (1 + beatInfo.beatStrength * 0.5);
        ctx.shadowBlur = 10;
        ctx.shadowColor = currentTheme.beat;
      } else {
        ctx.shadowBlur = 0;
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
      
      // Update peak holds
      if (config.showPeaks && barHeight > peakHolds.current[i]) {
        peakHolds.current[i] = barHeight;
        peakHoldTimers.current[i] = performance.now();
      }
    }
    
    ctx.shadowBlur = 0;
  };

  const drawFrequencyBands = (ctx: CanvasRenderingContext2D, frequencyData: Uint8Array) => {
    const bandHeight = 15;
    const bandY = height - 25;
    const bandWidth = width / frequencyBands.length;
    
    frequencyBands.forEach((band, index) => {
      const x = index * bandWidth;
      const energy = band.energy;
      const meterWidth = (energy / 255) * bandWidth * 0.8;
      
      // Band background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x + 5, bandY, bandWidth - 10, bandHeight);
      
      // Energy meter
      ctx.fillStyle = band.color;
      ctx.fillRect(x + 5, bandY, meterWidth, bandHeight);
      
      // Peak indicator
      if (band.peak > 0) {
        const peakX = x + 5 + (band.peak / 255) * (bandWidth - 10);
        ctx.fillStyle = currentTheme.peak;
        ctx.fillRect(peakX - 1, bandY, 2, bandHeight);
      }
      
      // Band label
      ctx.fillStyle = currentTheme.text;
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(band.name, x + bandWidth / 2, bandY - 5);
    });
  };

  const drawPeakHolds = (ctx: CanvasRenderingContext2D) => {
    const barWidth = width / config.barCount;
    const now = performance.now();
    
    for (let i = 0; i < peakHolds.current.length; i++) {
      const peakHeight = peakHolds.current[i];
      const timeSincePeak = now - peakHoldTimers.current[i];
      
      // Decay peak hold after 1 second
      if (timeSincePeak > 1000) {
        peakHolds.current[i] *= 0.95;
        if (peakHolds.current[i] < 1) peakHolds.current[i] = 0;
      }
      
      if (peakHeight > 0) {
        const x = i * barWidth;
        const y = height - peakHeight - 30;
        
        ctx.strokeStyle = currentTheme.peak;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + barWidth - 1, y);
        ctx.stroke();
      }
    }
  };

  const drawBeatIndicator = (ctx: CanvasRenderingContext2D) => {
    if (!beatInfo) return;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 30 * beatInfo.beatStrength;
    
    ctx.save();
    ctx.globalAlpha = beatInfo.confidence * 0.7;
    ctx.strokeStyle = currentTheme.beat;
    ctx.lineWidth = 3;
    
    // Draw expanding circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw beat strength indicator
    ctx.fillStyle = currentTheme.beat;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${beatInfo.bpm.toFixed(0)} BPM`, centerX, centerY + 5);
    
    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = currentTheme.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Horizontal grid lines (dB levels)
    const levels = [-60, -40, -20, -6, 0];
    levels.forEach(level => {
      const y = height - 30 - ((level + 60) / 60) * (height - 60);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Level label
      ctx.fillStyle = currentTheme.text;
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${level} dB`, 5, y - 2);
    });
    
    ctx.setLineDash([]);
  };

  const drawFrequencyLabels = (ctx: CanvasRenderingContext2D) => {
    const frequencies = [100, 500, 1000, 5000, 10000];
    const nyquist = 22050; // Assuming 44.1kHz sample rate
    
    ctx.fillStyle = currentTheme.text;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    
    frequencies.forEach(freq => {
      if (freq <= nyquist) {
        const x = (freq / nyquist) * width;
        ctx.fillText(freq >= 1000 ? `${freq/1000}k` : `${freq}`, x, height - 5);
      }
    });
  };

  const renderWaterfall = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !deck) return;

    const frequencyData = deck.getFrequencyData();
    if (!frequencyData || frequencyData.length === 0) return;

    // Add current spectrum to waterfall data
    waterfallData.current.unshift(Array.from(frequencyData));
    
    // Limit waterfall history
    if (waterfallData.current.length > 200) {
      waterfallData.current.pop();
    }

    // Setup canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = 150 * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = currentTheme.background;
    ctx.fillRect(0, 0, width, 150);

    // Draw waterfall
    const imageData = ctx.createImageData(width, 150);
    
    for (let y = 0; y < Math.min(150, waterfallData.current.length); y++) {
      const spectrum = waterfallData.current[y];
      for (let x = 0; x < width; x++) {
        const binIndex = Math.floor((x / width) * spectrum.length);
        const intensity = spectrum[binIndex] / 255;
        
        const pixelIndex = (y * width + x) * 4;
        const color = intensityToColor(intensity);
        
        imageData.data[pixelIndex] = color.r;
        imageData.data[pixelIndex + 1] = color.g;
        imageData.data[pixelIndex + 2] = color.b;
        imageData.data[pixelIndex + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const applySmoothing = (data: Uint8Array): Uint8Array => {
    if (config.smoothing === 0) return data;
    
    const smoothed = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      let sum = 0;
      let count = 0;
      const radius = Math.ceil(config.smoothing * 3);
      
      for (let j = Math.max(0, i - radius); j <= Math.min(data.length - 1, i + radius); j++) {
        sum += data[j];
        count++;
      }
      
      smoothed[i] = sum / count;
    }
    
    return smoothed;
  };

  const getBarColor = (index: number, height: number, maxHeight: number): string => {
    switch (config.colorMode) {
      case 'gradient':
        const gradientPos = index / config.barCount;
        return interpolateGradient(currentTheme.gradient, gradientPos);
        
      case 'frequency':
        if (index < config.barCount * 0.2) return '#ff0040'; // Bass - Red
        if (index < config.barCount * 0.4) return '#ff8000'; // Low mid - Orange
        if (index < config.barCount * 0.6) return '#ffff00'; // Mid - Yellow
        if (index < config.barCount * 0.8) return '#00ff80'; // High mid - Green
        return '#00ffff'; // High - Cyan
        
      case 'energy':
        const intensity = height / maxHeight;
        if (intensity > 0.8) return '#ff0040';
        if (intensity > 0.6) return '#ff4000';
        if (intensity > 0.4) return '#ff8000';
        if (intensity > 0.2) return '#ffff00';
        return '#00ff80';
        
      default:
        return currentTheme.gradient[0];
    }
  };

  const interpolateGradient = (colors: string[], position: number): string => {
    if (colors.length === 0) return '#ffffff';
    if (colors.length === 1) return colors[0];
    
    const scaledPos = position * (colors.length - 1);
    const index = Math.floor(scaledPos);
    const factor = scaledPos - index;
    
    if (index >= colors.length - 1) return colors[colors.length - 1];
    
    return interpolateColors(colors[index], colors[index + 1], factor);
  };

  const interpolateColors = (color1: string, color2: string, factor: number): string => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    
    if (!c1 || !c2) return color1;
    
    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const intensityToColor = (intensity: number) => {
    // Convert intensity to heat map colors
    if (intensity < 0.25) {
      return { r: 0, g: Math.floor(intensity * 4 * 255), b: 255 };
    } else if (intensity < 0.5) {
      return { r: 0, g: 255, b: Math.floor((0.5 - intensity) * 4 * 255) };
    } else if (intensity < 0.75) {
      return { r: Math.floor((intensity - 0.5) * 4 * 255), g: 255, b: 0 };
    } else {
      return { r: 255, g: Math.floor((1 - intensity) * 4 * 255), b: 0 };
    }
  };

  const updateFrequencyBandEnergy = (frequencyData: Uint8Array) => {
    const nyquist = 22050; // Assuming 44.1kHz sample rate
    const binWidth = nyquist / frequencyData.length;
    
    frequencyBands.forEach(band => {
      const startBin = Math.floor(band.range[0] / binWidth);
      const endBin = Math.floor(band.range[1] / binWidth);
      
      let energy = 0;
      let count = 0;
      
      for (let i = startBin; i <= endBin && i < frequencyData.length; i++) {
        energy += frequencyData[i];
        count++;
      }
      
      band.energy = count > 0 ? energy / count : 0;
      
      // Update peak with hold
      if (band.energy > band.peak) {
        band.peak = band.energy;
        band.peakHold = performance.now();
      } else if (performance.now() - band.peakHold > 1000) {
        band.peak *= 0.95;
      }
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleConfigChange = (key: keyof SpectrumConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`spectrum-analyzer ${className}`}>
      {/* Main Spectrum Display */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Advanced Spectrum Analyzer</h3>
            </div>
            
            <div className="flex items-center space-x-2">
              {beatInfo && (
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <Activity className="w-4 h-4" />
                  <span>{beatInfo.bpm.toFixed(1)} BPM</span>
                  <span className="text-green-400">
                    {(beatInfo.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                data-testid="button-spectrum-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                data-testid="button-spectrum-fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Canvas Container */}
          <div 
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ width: `${width}px`, height: `${height}px` }}
          >
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="absolute inset-0"
              data-testid="canvas-spectrum-analyzer"
            />
            
            {!isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-gray-500 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Play audio to see spectrum analysis</p>
                </div>
              </div>
            )}
          </div>

          {/* Waterfall Display */}
          {config.showWaterfall && (
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-2">Spectral Waterfall</div>
              <div 
                className="bg-black rounded-lg overflow-hidden"
                style={{ width: `${width}px`, height: '150px' }}
              >
                <canvas
                  ref={waterfallCanvasRef}
                  width={width}
                  height={150}
                  className="block"
                  data-testid="canvas-waterfall"
                />
              </div>
            </div>
          )}

          {/* Performance Stats */}
          <div className="mt-4 flex justify-between text-xs text-gray-500">
            <span>FPS: {performanceStats.fps.toFixed(1)}</span>
            <span>Processing: {performanceStats.processingTime.toFixed(1)}ms</span>
            <span>Bars: {config.barCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {showSettings && showControls && (
        <Card className="mt-4 bg-gray-800 border-gray-600">
          <CardContent className="p-4 space-y-4">
            <h4 className="font-semibold text-white">Spectrum Settings</h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Sensitivity */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Sensitivity: {config.sensitivity.toFixed(1)}x
                </label>
                <Slider
                  value={[config.sensitivity]}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  onValueChange={([value]) => handleConfigChange('sensitivity', value)}
                  data-testid="slider-spectrum-sensitivity"
                />
              </div>

              {/* Smoothing */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Smoothing: {config.smoothing.toFixed(1)}
                </label>
                <Slider
                  value={[config.smoothing]}
                  min={0}
                  max={1}
                  step={0.1}
                  onValueChange={([value]) => handleConfigChange('smoothing', value)}
                  data-testid="slider-spectrum-smoothing"
                />
              </div>

              {/* Bar Count */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Bars: {config.barCount}
                </label>
                <Slider
                  value={[config.barCount]}
                  min={32}
                  max={512}
                  step={16}
                  onValueChange={([value]) => handleConfigChange('barCount', value)}
                  data-testid="slider-spectrum-bars"
                />
              </div>

              {/* Color Mode */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Color Mode</label>
                <select
                  value={config.colorMode}
                  onChange={(e) => handleConfigChange('colorMode', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white"
                  data-testid="select-spectrum-color-mode"
                >
                  <option value="gradient">Gradient</option>
                  <option value="frequency">Frequency</option>
                  <option value="energy">Energy</option>
                </select>
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.logScale}
                  onCheckedChange={(checked) => handleConfigChange('logScale', checked)}
                  data-testid="switch-spectrum-log-scale"
                />
                <label className="text-sm text-gray-300">Log Scale</label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.showPeaks}
                  onCheckedChange={(checked) => handleConfigChange('showPeaks', checked)}
                  data-testid="switch-spectrum-peaks"
                />
                <label className="text-sm text-gray-300">Peak Holds</label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.showWaterfall}
                  onCheckedChange={(checked) => handleConfigChange('showWaterfall', checked)}
                  data-testid="switch-spectrum-waterfall"
                />
                <label className="text-sm text-gray-300">Waterfall</label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.beatReactive}
                  onCheckedChange={(checked) => handleConfigChange('beatReactive', checked)}
                  data-testid="switch-spectrum-beat-reactive"
                />
                <label className="text-sm text-gray-300">Beat Reactive</label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}