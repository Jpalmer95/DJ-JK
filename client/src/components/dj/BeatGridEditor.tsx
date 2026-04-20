import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { DJDeck } from '@/lib/djAudio';
import { RotateCcw, Check, Plus, Minus, Target, Music } from 'lucide-react';

interface BeatGridEditorProps {
  deck: DJDeck;
  compact?: boolean;
}

export default function BeatGridEditor({ deck, compact = false }: BeatGridEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [beatGrid, setBeatGrid] = useState<number[]>([]);
  const [bpm, setBpm] = useState<number>(120);
  const [firstBeatOffset, setFirstBeatOffset] = useState<number>(0);
  const [isDraggingMarker, setIsDraggingMarker] = useState<boolean>(false);
  const [draggedBeatIndex, setDraggedBeatIndex] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapBpm, setTapBpm] = useState<number | null>(null);

  // Determine accent color based on deck ID
  const isDeckA = deck.id.toLowerCase().includes('a') || deck.id === 'Deck A';
  const accentColor = isDeckA ? '#00bcd4' : '#e91e63'; // Cyan for A, Magenta for B
  const accentColorAlpha = isDeckA ? 'rgba(0, 188, 212, 0.3)' : 'rgba(233, 30, 99, 0.3)';

  // Initialize from deck
  useEffect(() => {
    if (!deck) return;

    const updateFromDeck = () => {
      if (deck.trackInfo?.waveformData) {
        setWaveformData([...deck.trackInfo.waveformData]);
      }
      setBeatGrid([...deck.beatGrid]);
      setBpm(deck.bpm);
      if (deck.beatGrid.length > 0) {
        setFirstBeatOffset(deck.beatGrid[0]);
      }
    };

    updateFromDeck();

    const handleTrackLoaded = () => updateFromDeck();
    const handleAnalysisComplete = () => updateFromDeck();

    deck.onTrackLoaded(handleTrackLoaded);
    deck.onAnalysisComplete(handleAnalysisComplete);

    return () => {
      // Cleanup listeners if needed
    };
  }, [deck]);

  // Format time as MM:SS.mmm
  const formatTimeDetailed = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Regenerate beat grid from BPM and offset
  const regenerateBeatGrid = useCallback((newBpm: number, offset: number) => {
    if (!deck?.duration) return;

    const beatInterval = 60 / newBpm;
    const newGrid: number[] = [];

    for (let time = offset; time < deck.duration; time += beatInterval) {
      newGrid.push(time);
    }

    setBeatGrid(newGrid);
    return newGrid;
  }, [deck]);

  // Handle BPM change
  const handleBpmChange = (delta: number) => {
    const newBpm = Math.max(60, Math.min(200, bpm + delta));
    setBpm(newBpm);
    regenerateBeatGrid(newBpm, firstBeatOffset);
  };

  const handleBpmInput = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 60 && parsed <= 200) {
      setBpm(parsed);
      regenerateBeatGrid(parsed, firstBeatOffset);
    }
  };

  // Handle first beat offset change
  const handleOffsetChange = (value: number[]) => {
    const offset = value[0];
    setFirstBeatOffset(offset);
    regenerateBeatGrid(bpm, offset);
  };

  // Snap first beat to nearest energy peak
  const snapToGrid = () => {
    if (!waveformData || !deck?.duration) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find the nearest energy peak to current first beat position
    const beatInterval = 60 / bpm;
    const searchRadius = beatInterval / 2; // Search within half a beat

    // Find peak energy near the current first beat offset
    const samplesPerPixel = deck.duration / waveformData.length;
    const centerIndex = Math.floor(firstBeatOffset / samplesPerPixel);
    const searchWidth = Math.floor(searchRadius / samplesPerPixel);

    let maxEnergy = 0;
    let peakIndex = centerIndex;

    for (
      let i = Math.max(0, centerIndex - searchWidth);
      i < Math.min(waveformData.length, centerIndex + searchWidth);
      i++
    ) {
      if (waveformData[i] > maxEnergy) {
        maxEnergy = waveformData[i];
        peakIndex = i;
      }
    }

    const newOffset = peakIndex * samplesPerPixel;
    setFirstBeatOffset(newOffset);
    regenerateBeatGrid(bpm, newOffset);
  };

  // Tap tempo handler
  const handleTapTempo = () => {
    const now = Date.now();
    tapTimesRef.current.push(now);

    // Keep only the last 8 taps
    if (tapTimesRef.current.length > 8) {
      tapTimesRef.current.shift();
    }

    // Need at least 2 taps to calculate BPM
    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round((60000 / avgInterval) * 10) / 10;

      if (calculatedBpm >= 60 && calculatedBpm <= 200) {
        setTapBpm(calculatedBpm);
        setBpm(calculatedBpm);
        regenerateBeatGrid(calculatedBpm, firstBeatOffset);
      }
    }

    // Reset taps after 2 seconds of inactivity
    setTimeout(() => {
      if (Date.now() - tapTimesRef.current[tapTimesRef.current.length - 1] > 2000) {
        tapTimesRef.current = [];
        setTapBpm(null);
      }
    }, 2000);
  };

  // Reset to auto-detected values
  const handleReset = () => {
    const detectedBpm = deck.detectedBpm;
    setBpm(detectedBpm);

    // Recalculate first beat offset from original grid
    if (deck.beatGrid.length > 0) {
      setFirstBeatOffset(deck.beatGrid[0]);
      regenerateBeatGrid(detectedBpm, deck.beatGrid[0]);
    } else {
      setFirstBeatOffset(0);
      regenerateBeatGrid(detectedBpm, 0);
    }

    tapTimesRef.current = [];
    setTapBpm(null);
  };

  // Apply beat grid to deck
  const handleApply = () => {
    deck.setBPM(bpm);

    // Manually update the beat grid with our custom grid
    deck.beatGrid = [...beatGrid];

    // Update track info if available
    if (deck.trackInfo) {
      deck.trackInfo.bpm = bpm;
    }

    console.log(`Applied beat grid: ${bpm} BPM, ${beatGrid.length} beats, offset: ${firstBeatOffset.toFixed(3)}s`);
  };

  // Canvas click handler - add/remove beats or drag
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingMarker) return;

    const canvas = canvasRef.current;
    if (!canvas || !deck?.duration) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickTime = (x / canvas.clientWidth) * deck.duration;

    // Check if clicking near an existing beat (remove it)
    const beatInterval = 60 / bpm;
    const threshold = beatInterval * 0.3; // 30% of beat interval

    const nearestBeatIndex = beatGrid.findIndex(
      (beatTime) => Math.abs(beatTime - clickTime) < threshold
    );

    if (nearestBeatIndex >= 0) {
      // Remove this beat
      const newGrid = beatGrid.filter((_, i) => i !== nearestBeatIndex);
      setBeatGrid(newGrid);
    } else {
      // Add a new beat at click position and re-sort
      const newGrid = [...beatGrid, clickTime].sort((a, b) => a - b);
      setBeatGrid(newGrid);
    }
  };

  // Mouse move handler for hover time and dragging
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !deck?.duration) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;

    setHoverX(x);
    setHoverTime((x / canvas.clientWidth) * deck.duration);

    // Handle marker dragging
    if (isDraggingMarker && draggedBeatIndex !== null) {
      const newTime = (x / canvas.clientWidth) * deck.duration;
      const newGrid = [...beatGrid];
      newGrid[draggedBeatIndex] = Math.max(0, Math.min(deck.duration, newTime));
      newGrid.sort((a, b) => a - b);
      setBeatGrid(newGrid);
    }
  };

  // Mouse down on beat marker to start dragging
  const handleMarkerMouseDown = (event: React.MouseEvent<HTMLCanvasElement>, beatIndex: number) => {
    event.stopPropagation();
    setIsDraggingMarker(true);
    setDraggedBeatIndex(beatIndex);
  };

  // Mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDraggingMarker(false);
    setDraggedBeatIndex(null);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    handleMouseUp();
  };

  // Global mouseup handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingMarker(false);
      setDraggedBeatIndex(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Draw waveform with beat grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const duration = deck?.duration || 0;

    // Clear and draw background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    if (waveformData && duration > 0) {
      const barWidth = width / waveformData.length;
      const maxAmplitude = Math.max(...waveformData);
      const scaleFactor = maxAmplitude > 0 ? 1 / maxAmplitude : 1;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, height / 2, 0, 0);
      gradient.addColorStop(0, 'rgba(100, 100, 100, 0.3)');
      gradient.addColorStop(0.5, 'rgba(150, 150, 150, 0.8)');
      gradient.addColorStop(1, 'rgba(100, 100, 100, 0.3)');
      ctx.fillStyle = gradient;

      for (let i = 0; i < waveformData.length; i++) {
        const amplitude = waveformData[i] * scaleFactor;
        const barHeight = amplitude * height * 0.7;

        ctx.fillRect(
          i * barWidth,
          height / 2 - barHeight / 2,
          barWidth - 0.5,
          barHeight
        );
      }
    }

    // Draw beat grid markers
    if (beatGrid.length > 0 && duration > 0) {
      const pixelsPerSecond = width / duration;

      beatGrid.forEach((beatTime, index) => {
        const x = beatTime * pixelsPerSecond;
        const isBarLine = index % 4 === 0;

        // Beat line
        ctx.beginPath();
        ctx.strokeStyle = isBarLine ? accentColor : `${accentColor}88`;
        ctx.lineWidth = isBarLine ? 2 : 1;
        ctx.setLineDash(isBarLine ? [] : [2, 3]);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Beat number on bar lines
        if (isBarLine) {
          ctx.fillStyle = accentColor;
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${Math.floor(index / 4) + 1}`, x, 12);
        }

        // Draggable handle circle at top
        const handleRadius = 4;
        const isNearHover = hoverTime !== null && Math.abs(beatTime - hoverTime) < (60 / bpm) * 0.2;

        ctx.beginPath();
        ctx.arc(x, handleRadius + 2, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = isNearHover || draggedBeatIndex === index ? accentColor : `${accentColor}66`;
        ctx.fill();
      });
    }

    // Draw playhead
    if (duration > 0 && deck) {
      const playheadX = (deck.currentTime / duration) * width;
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead triangle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX + 6, 8);
      ctx.lineTo(playheadX - 6, 8);
      ctx.closePath();
      ctx.fill();
    }

    // Draw hover indicator
    if (hoverTime !== null && !isDraggingMarker) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [waveformData, beatGrid, bpm, hoverTime, hoverX, deck, accentColor, draggedBeatIndex, isDraggingMarker]);

  const containerHeight = compact ? 60 : 100;

  return (
    <div className="w-full space-y-2" data-testid="beat-grid-editor">
      {/* Waveform canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-md cursor-crosshair border border-white/10"
          style={{ height: `${containerHeight}px` }}
          onClick={handleCanvasClick}
          onMouseDown={(e) => {
            // Check if clicking near a beat marker
            if (!canvasRef.current || !deck?.duration) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const clickTime = (x / canvasRef.current.clientWidth) * deck.duration;
            const beatInterval = 60 / bpm;
            const threshold = beatInterval * 0.15;

            const nearestIndex = beatGrid.findIndex(
              (bt) => Math.abs(bt - clickTime) < threshold
            );

            if (nearestIndex >= 0) {
              handleMarkerMouseDown(e, nearestIndex);
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          data-testid="beat-grid-canvas"
        />

        {/* Hover time tooltip */}
        {hoverTime !== null && deck?.duration && (
          <div
            className="absolute pointer-events-none z-10 bg-black/90 text-white text-xs px-2 py-1 rounded border border-white/20"
            style={{
              left: `${Math.min(hoverX, (canvasRef.current?.clientWidth || 300) - 70)}px`,
              top: '-24px',
            }}
          >
            {formatTimeDetailed(hoverTime)}
          </div>
        )}

        {/* Info overlay */}
        <div
          className="absolute bottom-1 left-1 text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: accentColorAlpha, color: accentColor }}
        >
          {beatGrid.length} beats | {bpm.toFixed(1)} BPM
        </div>
      </div>

      {/* Controls */}
      {!compact && (
        <div className="space-y-3 p-3 bg-gray-900/80 rounded-md border border-white/10">
          {/* BPM Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Music className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-xs text-gray-400 w-10">BPM</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-12 text-xs"
                onClick={() => handleBpmChange(-1.0)}
                data-testid="bpm-minus-1"
              >
                -1.0
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-10 text-xs"
                onClick={() => handleBpmChange(-0.1)}
                data-testid="bpm-minus-0.1"
              >
                -0.1
              </Button>
              <Input
                type="number"
                value={bpm.toFixed(1)}
                onChange={(e) => handleBpmInput(e.target.value)}
                className="w-20 h-7 text-center text-sm"
                min={60}
                max={200}
                step={0.1}
                data-testid="bpm-input"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-10 text-xs"
                onClick={() => handleBpmChange(0.1)}
                data-testid="bpm-plus-0.1"
              >
                +0.1
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-12 text-xs"
                onClick={() => handleBpmChange(1.0)}
                data-testid="bpm-plus-1"
              >
                +1.0
              </Button>
            </div>
          </div>

          {/* First Beat Offset */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" style={{ color: accentColor }} />
              <span className="text-xs text-gray-400 w-10">Offset</span>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Slider
                value={[firstBeatOffset]}
                onValueChange={handleOffsetChange}
                min={0}
                max={Math.min(5, deck?.duration || 5)}
                step={0.001}
                className="flex-1"
                data-testid="offset-slider"
              />
              <span className="text-xs text-gray-400 w-20 font-mono">
                {firstBeatOffset.toFixed(3)}s
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTapTempo}
              className="h-8 text-xs"
              style={{ borderColor: accentColor, color: accentColor }}
              data-testid="tap-tempo-btn"
            >
              <Music className="w-3 h-3 mr-1" />
              Tap Tempo
              {tapBpm && (
                <span className="ml-1 opacity-70">({tapBpm.toFixed(1)})</span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={snapToGrid}
              className="h-8 text-xs"
              data-testid="snap-to-grid-btn"
            >
              <Target className="w-3 h-3 mr-1" />
              Snap to Grid
            </Button>

            <div className="flex-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs"
              data-testid="reset-btn"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>

            <Button
              size="sm"
              onClick={handleApply}
              className="h-8 text-xs"
              style={{ backgroundColor: accentColor }}
              data-testid="apply-btn"
            >
              <Check className="w-3 h-3 mr-1" />
              Apply
            </Button>
          </div>

          {/* Help text */}
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>• Click waveform to add beats, click existing beats to remove</p>
            <p>• Drag beat markers (circles) to fine-tune positions</p>
            <p>• Use Tap Tempo to detect BPM by clicking in rhythm</p>
          </div>
        </div>
      )}
    </div>
  );
}
