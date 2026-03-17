import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import EffectKnob from './EffectKnob';
import { DJDeck } from '@/lib/djAudio';
import { Volume2, VolumeX, Activity } from 'lucide-react';

interface EqualizerPanelProps {
  deck: DJDeck;
  deckLabel: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showFrequencyResponse?: boolean;
  'data-testid'?: string;
}

interface EQBandState {
  gain: number;
  kill: boolean;
}

interface EQState {
  high: EQBandState;
  mid: EQBandState;
  low: EQBandState;
}

export default function EqualizerPanel({
  deck,
  deckLabel,
  className,
  size = 'md',
  showFrequencyResponse = true,
  'data-testid': testId
}: EqualizerPanelProps) {
  const [eqState, setEqState] = useState<EQState>({
    high: { gain: 0, kill: false },
    mid: { gain: 0, kill: false },
    low: { gain: 0, kill: false }
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Initialize EQ effect if not present
  useEffect(() => {
    if (!deck.getEffect('eq3')) {
      deck.addEffect('ThreeBandEQ', 'eq3');
    }
  }, [deck]);
  
  // Size configurations
  const sizeConfig = {
    sm: {
      knobSize: 'sm' as const,
      canvas: 'h-16',
      spacing: 'space-y-2',
      text: 'text-xs',
      button: 'h-6 text-xs px-2'
    },
    md: {
      knobSize: 'md' as const,
      canvas: 'h-20',
      spacing: 'space-y-3',
      text: 'text-sm',
      button: 'h-8 text-sm px-3'
    },
    lg: {
      knobSize: 'lg' as const,
      canvas: 'h-24',
      spacing: 'space-y-4',
      text: 'text-base',
      button: 'h-10 text-base px-4'
    }
  };
  
  const config = sizeConfig[size];
  
  // Update EQ parameters
  const updateEQParameter = (band: keyof EQState, parameter: 'gain' | 'kill', value: number) => {
    const eq = deck.getEffect('eq3');
    if (!eq) return;
    
    if (parameter === 'gain') {
      eq.setParameter(`${band}Gain`, value);
      setEqState(prev => ({
        ...prev,
        [band]: { ...prev[band], gain: value }
      }));
    } else if (parameter === 'kill') {
      const isKill = value === 1;
      eq.setParameter(`${band}Kill`, value);
      setEqState(prev => ({
        ...prev,
        [band]: { ...prev[band], kill: isKill }
      }));
    }
  };
  
  // Kill switch handlers
  const handleKillToggle = (band: keyof EQState) => {
    const newKillState = !eqState[band].kill;
    updateEQParameter(band, 'kill', newKillState ? 1 : 0);
  };
  
  // Get gain knob color based on value
  const getGainKnobColor = (gain: number) => {
    if (gain > 5) return 'red';
    if (gain > 0) return 'orange';
    if (gain < -10) return 'purple';
    return 'blue';
  };
  
  // Frequency response visualization
  const drawFrequencyResponse = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    
    // Horizontal grid (dB levels)
    const dbLevels = [-20, -10, 0, 10];
    dbLevels.forEach(db => {
      const y = height/2 - (db / 30) * (height/2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });
    
    // Vertical grid (frequency bands)
    const freqPoints = [0.2, 0.4, 0.6, 0.8]; // Normalized frequency points
    freqPoints.forEach(freq => {
      const x = freq * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
    
    // EQ curve
    ctx.strokeStyle = '#10b981'; // green-500
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const points = 100;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const normalizedFreq = i / points;
      
      // Calculate EQ response at this frequency
      let response = 0;
      
      // Low shelf (0-0.32)
      if (normalizedFreq <= 0.32) {
        const blend = Math.pow(1 - normalizedFreq / 0.32, 2);
        response += eqState.low.kill ? -60 : eqState.low.gain * blend;
      }
      
      // Mid peaking (0.1-0.9)
      if (normalizedFreq >= 0.1 && normalizedFreq <= 0.9) {
        const peak = 0.5; // Center frequency
        const q = 0.5; // Q factor
        const distance = Math.abs(normalizedFreq - peak);
        const blend = Math.exp(-(distance * distance) / (2 * q * q));
        response += eqState.mid.kill ? -60 : eqState.mid.gain * blend;
      }
      
      // High shelf (0.68-1.0)
      if (normalizedFreq >= 0.68) {
        const blend = Math.pow((normalizedFreq - 0.68) / 0.32, 2);
        response += eqState.high.kill ? -60 : eqState.high.gain * blend;
      }
      
      // Clamp response
      response = Math.max(-30, Math.min(15, response));
      
      const y = height/2 - (response / 30) * (height/2);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Frequency labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    
    const freqLabels = ['100Hz', '1kHz', '10kHz'];
    const freqPositions = [0.15, 0.5, 0.85];
    
    freqLabels.forEach((label, i) => {
      ctx.fillText(label, freqPositions[i] * width, height - 5);
    });
    
    // dB labels
    ctx.textAlign = 'left';
    ctx.fillText('+15dB', 5, 15);
    ctx.fillText('0dB', 5, height/2 + 4);
    ctx.fillText('-15dB', 5, height - 5);
  };
  
  // Animation loop for frequency visualization
  useEffect(() => {
    if (showFrequencyResponse && canvasRef.current) {
      // Set canvas size
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(devicePixelRatio, devicePixelRatio);
      }
      
      const animate = () => {
        drawFrequencyResponse();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      animate();
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [showFrequencyResponse, eqState]);
  
  // Real-time frequency analysis
  useEffect(() => {
    if (deck && isAnalyzing) {
      const analyzeFrequency = () => {
        const frequencyData = deck.getFrequencyData();
        
        if (frequencyData.length > 0) {
          // Process frequency data for visualization
          // This could be enhanced to show real-time spectrum analysis
        }
        
        if (isAnalyzing) {
          requestAnimationFrame(analyzeFrequency);
        }
      };
      
      analyzeFrequency();
    }
  }, [deck, isAnalyzing]);
  
  return (
    <Card className={cn('glass-panel neon-border', className)} data-testid={testId}>
      <CardHeader className="pb-2">
        <CardTitle className={cn(
          'text-center text-white/70 flex items-center justify-between',
          config.text
        )}>
          <Volume2 className="w-4 h-4" />
          <span>{deckLabel} EQ</span>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'p-1 h-auto',
              isAnalyzing ? 'text-green-400' : 'text-white/40'
            )}
            onClick={() => setIsAnalyzing(!isAnalyzing)}
            data-testid={`button-eq-analyzer-${deckLabel.toLowerCase()}`}
          >
            <Activity className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className={cn('space-y-4', config.spacing)}>
        {/* Frequency Response Visualization */}
        {showFrequencyResponse && (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={cn(
                'w-full bg-black/30 rounded border border-white/10',
                config.canvas
              )}
              data-testid={`canvas-eq-response-${deckLabel.toLowerCase()}`}
            />
            <div className="absolute top-1 right-1 text-xs text-white/40 bg-black/30 px-1 rounded">
              EQ Response
            </div>
          </div>
        )}
        
        {/* EQ Controls */}
        <div className="grid grid-cols-3 gap-4">
          {/* High Band */}
          <div className="flex flex-col items-center space-y-2">
            <EffectKnob
              value={eqState.high.gain}
              min={-30}
              max={15}
              defaultValue={0}
              label="HIGH"
              unit="dB"
              size={config.knobSize}
              color={getGainKnobColor(eqState.high.gain)}
              disabled={eqState.high.kill}
              onChange={(value) => updateEQParameter('high', 'gain', value)}
              data-testid={`knob-eq-high-${deckLabel.toLowerCase()}`}
            />
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'font-bold border-2 transition-all',
                config.button,
                eqState.high.kill
                  ? 'bg-red-600 border-red-500 text-white shadow-red-500/50 shadow-lg'
                  : 'border-white/10 text-white/60 hover:border-red-500 hover:text-red-400'
              )}
              onClick={() => handleKillToggle('high')}
              data-testid={`button-eq-high-kill-${deckLabel.toLowerCase()}`}
            >
              {eqState.high.kill ? <VolumeX className="w-3 h-3" /> : 'KILL'}
            </Button>
          </div>
          
          {/* Mid Band */}
          <div className="flex flex-col items-center space-y-2">
            <EffectKnob
              value={eqState.mid.gain}
              min={-30}
              max={15}
              defaultValue={0}
              label="MID"
              unit="dB"
              size={config.knobSize}
              color={getGainKnobColor(eqState.mid.gain)}
              disabled={eqState.mid.kill}
              onChange={(value) => updateEQParameter('mid', 'gain', value)}
              data-testid={`knob-eq-mid-${deckLabel.toLowerCase()}`}
            />
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'font-bold border-2 transition-all',
                config.button,
                eqState.mid.kill
                  ? 'bg-red-600 border-red-500 text-white shadow-red-500/50 shadow-lg'
                  : 'border-white/10 text-white/60 hover:border-red-500 hover:text-red-400'
              )}
              onClick={() => handleKillToggle('mid')}
              data-testid={`button-eq-mid-kill-${deckLabel.toLowerCase()}`}
            >
              {eqState.mid.kill ? <VolumeX className="w-3 h-3" /> : 'KILL'}
            </Button>
          </div>
          
          {/* Low Band */}
          <div className="flex flex-col items-center space-y-2">
            <EffectKnob
              value={eqState.low.gain}
              min={-30}
              max={15}
              defaultValue={0}
              label="LOW"
              unit="dB"
              size={config.knobSize}
              color={getGainKnobColor(eqState.low.gain)}
              disabled={eqState.low.kill}
              onChange={(value) => updateEQParameter('low', 'gain', value)}
              data-testid={`knob-eq-low-${deckLabel.toLowerCase()}`}
            />
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'font-bold border-2 transition-all',
                config.button,
                eqState.low.kill
                  ? 'bg-red-600 border-red-500 text-white shadow-red-500/50 shadow-lg'
                  : 'border-white/10 text-white/60 hover:border-red-500 hover:text-red-400'
              )}
              onClick={() => handleKillToggle('low')}
              data-testid={`button-eq-low-kill-${deckLabel.toLowerCase()}`}
            >
              {eqState.low.kill ? <VolumeX className="w-3 h-3" /> : 'KILL'}
            </Button>
          </div>
        </div>
        
        {/* EQ Status Indicators */}
        <div className="flex justify-center space-x-4 pt-2 border-t border-white/5">
          <div className="flex items-center space-x-1">
            <div className={cn(
              'w-2 h-2 rounded-full',
              eqState.high.gain !== 0 || eqState.high.kill ? 'bg-red-500 shadow-red-500/50 shadow-sm' : 'bg-white/10'
            )} />
            <span className="text-xs text-white/40">HI</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={cn(
              'w-2 h-2 rounded-full',
              eqState.mid.gain !== 0 || eqState.mid.kill ? 'bg-orange-500 shadow-orange-500/50 shadow-sm' : 'bg-white/10'
            )} />
            <span className="text-xs text-white/40">MID</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={cn(
              'w-2 h-2 rounded-full',
              eqState.low.gain !== 0 || eqState.low.kill ? 'bg-blue-500 shadow-blue-500/50 shadow-sm' : 'bg-white/10'
            )} />
            <span className="text-xs text-white/40">LOW</span>
          </div>
        </div>
        
        {/* Quick Reset */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-white/40 hover:text-white/70"
            onClick={() => {
              updateEQParameter('high', 'gain', 0);
              updateEQParameter('mid', 'gain', 0);
              updateEQParameter('low', 'gain', 0);
              updateEQParameter('high', 'kill', 0);
              updateEQParameter('mid', 'kill', 0);
              updateEQParameter('low', 'kill', 0);
            }}
            data-testid={`button-eq-reset-${deckLabel.toLowerCase()}`}
          >
            Reset EQ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}