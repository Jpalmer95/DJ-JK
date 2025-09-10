import { useEffect, useRef, useState } from 'react';
import { DJDeck } from '@/lib/djAudio';

interface WaveformVisualizerProps {
  deck: DJDeck;
  color?: string;
  height?: number;
  animated?: boolean;
}

export default function WaveformVisualizer({
  deck,
  color = '#3b82f6',
  height = 60,
  animated = true
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beatGrid, setBeatGrid] = useState<number[]>([]);
  const [cuePoints, setCuePoints] = useState<any[]>([]);
  const [loops, setLoops] = useState<any[]>([]);
  const [currentBeat, setCurrentBeat] = useState<number>(0);

  // Initialize with deck data and set up event listeners
  useEffect(() => {
    if (!deck) return;

    // Set up deck event listeners for real-time updates
    const updateTime = (time: number) => setCurrentTime(time);
    const updatePlayState = (playing: boolean) => setIsPlaying(playing);
    const updateBeat = (beat: number) => setCurrentBeat(beat);
    const updateTrackLoaded = () => {
      // Update waveform data from deck analysis
      if (deck.trackInfo?.waveformData) {
        setWaveformData([...deck.trackInfo.waveformData]);
      }
      
      // Update analysis state
      const analysisState = deck.getAnalysisState();
      setBeatGrid([...analysisState.beatGrid]);
      setCurrentBeat(analysisState.currentBeat);
      setIsLoading(false);
    };
    
    const updateAnalysisComplete = () => {
      const analysisState = deck.getAnalysisState();
      setBeatGrid([...analysisState.beatGrid]);
      if (deck.trackInfo?.waveformData) {
        setWaveformData([...deck.trackInfo.waveformData]);
      }
      setIsLoading(false);
    };

    // Event handlers for real-time updates
    const updateCuePoints = (cuePoints: any[]) => setCuePoints([...cuePoints]);
    const updateLoops = (loops: any[]) => setLoops([...loops]);
    
    // Register event callbacks
    deck.onTimeUpdate(updateTime);
    deck.onPlayStateChange(updatePlayState);
    deck.onBeat(updateBeat);
    deck.onTrackLoaded(updateTrackLoaded);
    deck.onAnalysisComplete(updateAnalysisComplete);
    deck.onCueChange(updateCuePoints);
    deck.onLoopChange(updateLoops);

    // Initialize current state
    setCurrentTime(deck.currentTime);
    setIsPlaying(deck.isPlaying);
    setCuePoints([...deck.cuePoints]);
    setLoops([...deck.loops]);
    
    // Check if track is already loaded
    if (deck.trackInfo) {
      updateTrackLoaded();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [deck]);

  // Handle animation updates
  useEffect(() => {
    if (!waveformData) return;

    if (isPlaying && animated) {
      startAnimation();
    } else {
      // Draw static waveform
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      drawProfessionalWaveform();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animated, waveformData, currentTime, beatGrid, cuePoints, loops, currentBeat]);

  const startAnimation = () => {
    if (!canvasRef.current || !waveformData) return;

    const animate = () => {
      drawProfessionalWaveform();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const drawProfessionalWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || !deck.trackInfo) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adjust for retina/high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const duration = deck.duration;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    drawWaveform(ctx, width, height, duration);
    
    // Draw beat grid from deck analysis
    drawBeatGrid(ctx, width, height, duration);
    
    // Draw cue point markers
    drawCuePoints(ctx, width, height, duration);
    
    // Draw loop regions
    drawLoopRegions(ctx, width, height, duration);
    
    // Draw playback position
    drawPlaybackPosition(ctx, width, height, duration);
    
    // Draw current beat indicator
    drawCurrentBeat(ctx, width, height, duration);
    
    // Draw time markers
    drawTimeMarkers(ctx, width, height, duration);
  };

  const drawWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number, duration: number) => {
    if (!waveformData) return;
    
    const barWidth = width / waveformData.length;
    let x = 0;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, height/2, 0, 0);
    const baseColor = color || '#3b82f6';
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.8)');
    
    ctx.fillStyle = gradient;

    // Draw waveform bars
    const maxAmplitude = Math.max(...waveformData);
    const scaleFactor = maxAmplitude > 0 ? 1 / maxAmplitude : 1;

    for (let i = 0; i < waveformData.length; i++) {
      const amplitude = waveformData[i] * scaleFactor;
      const barHeight = amplitude * height * 0.7;
      
      // Draw symmetric waveform
      ctx.fillRect(
        x, 
        height / 2 - barHeight / 2, 
        barWidth - 0.5, 
        barHeight
      );
      
      x += barWidth;
    }
  };

  const drawBeatGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, duration: number) => {
    if (!beatGrid.length || !duration) return;

    const pixelsPerSecond = width / duration;
    
    ctx.setLineDash([2, 4]);
    
    // Draw beat lines using deck's beat grid
    beatGrid.forEach((beatTime, index) => {
      const x = beatTime * pixelsPerSecond;
      
      if (index % 4 === 0) {
        // Stronger line every 4 beats (measure lines)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
      }
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
    
    ctx.setLineDash([]);
  };

  const drawCuePoints = (ctx: CanvasRenderingContext2D, width: number, height: number, duration: number) => {
    if (!cuePoints.length || !duration) return;
    
    const pixelsPerSecond = width / duration;
    
    cuePoints.forEach((cue) => {
      const x = cue.time * pixelsPerSecond;
      const cueColor = cue.color || '#ef4444';
      
      // Draw cue point marker (triangle)
      ctx.fillStyle = cueColor;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 8, 8);
      ctx.lineTo(x - 8, 8);
      ctx.closePath();
      ctx.fill();
      
      // Draw cue line
      ctx.strokeStyle = cueColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Draw cue label
      if (cue.name) {
        ctx.fillStyle = 'white';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cue.name, x, height - 5);
      }
    });
  };

  const drawLoopRegions = (ctx: CanvasRenderingContext2D, width: number, height: number, duration: number) => {
    if (!loops.length || !duration) return;
    
    const pixelsPerSecond = width / duration;
    
    loops.forEach((loop) => {
      if (!loop.isActive) return;
      
      const startX = loop.startTime * pixelsPerSecond;
      const endX = loop.endTime * pixelsPerSecond;
      const loopWidth = endX - startX;
      
      // Draw loop region background
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.fillRect(startX, 0, loopWidth, height);
      
      // Draw loop boundaries
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      
      // Start boundary
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, height);
      ctx.stroke();
      
      // End boundary
      ctx.beginPath();
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();
      
      // Loop label
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LOOP', startX + loopWidth / 2, 15);
    });
  };

  const drawPlaybackPosition = (ctx: CanvasRenderingContext2D, width: number, height: number, duration: number) => {
    if (!duration || currentTime < 0) return;
    
    const position = (currentTime / duration) * width;
    
    // Draw playback position line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, height);
    ctx.stroke();
    
    // Draw playhead indicator
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position + 6, 10);
    ctx.lineTo(position - 6, 10);
    ctx.closePath();
    ctx.fill();
  };

  const drawCurrentBeat = (ctx: CanvasRenderingContext2D, width: number, height: number, duration: number) => {
    if (!beatGrid.length || !duration || currentBeat <= 0) return;
    
    const pixelsPerSecond = width / duration;
    const beatTime = beatGrid[currentBeat - 1]; // currentBeat is 1-indexed
    
    if (beatTime !== undefined) {
      const x = beatTime * pixelsPerSecond;
      
      // Draw current beat highlight
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.fillRect(x - 2, 0, 4, height);
      
      // Draw beat number
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(currentBeat.toString(), x, 15);
    }
  };

  const drawTimeMarkers = (ctx: CanvasRenderingContext2D, width: number, height: number, duration: number) => {
    if (!duration) return;
    
    const intervals = Math.ceil(duration / 30);
    const pixelsPerSecond = width / duration;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= intervals; i++) {
      const time = i * 30;
      if (time > duration) break;
      
      const x = time * pixelsPerSecond;
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      const timeLabel = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      ctx.fillText(timeLabel, x, height - 2);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, height - 12);
      ctx.lineTo(x, height - 8);
      ctx.stroke();
    }
  };

  // Handle canvas click for seeking
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!deck || !deck.duration) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickPosition = (x / canvas.clientWidth) * deck.duration;
    
    deck.seek(clickPosition);
  };

  return (
    <div className="w-full relative" data-testid={`waveform-${deck?.id.toLowerCase().replace(' ', '-') || 'default'}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 rounded-md">
          <div className="animate-pulse text-sm text-gray-300">Analyzing audio...</div>
        </div>
      )}
      
      <canvas 
        ref={canvasRef} 
        className={`w-full rounded-md cursor-pointer border border-gray-600 ${isPlaying ? 'ring-2 ring-blue-500' : ''}`}
        style={{ height: `${height}px` }}
        onClick={handleCanvasClick}
        data-testid={`canvas-waveform-${deck?.id.toLowerCase().replace(' ', '-') || 'default'}`}
      />
      
      {/* Professional DJ Waveform Legend */}
      <div className="absolute top-1 right-1 text-xs text-gray-400 bg-black bg-opacity-50 px-2 py-1 rounded">
        <div className="flex items-center space-x-3">
          <span className="flex items-center">
            <div className="w-2 h-2 bg-white mr-1"></div>
            Position
          </span>
          {cuePoints.length > 0 && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-500 mr-1"></div>
              Cues
            </span>
          )}
          {loops.some(l => l.isActive) && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 mr-1"></div>
              Loop
            </span>
          )}
          {beatGrid.length > 0 && (
            <span className="flex items-center">
              <div className="w-2 h-1 border-r border-white mr-1"></div>
              Beats
            </span>
          )}
          {currentBeat > 0 && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 mr-1"></div>
              Beat {currentBeat}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}