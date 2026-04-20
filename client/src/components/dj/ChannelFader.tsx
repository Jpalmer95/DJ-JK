import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DJDeck } from '@/lib/djAudio';

// Types
export type CrossfaderCurve = 'linear' | 'smooth' | 'cut' | 'hamster';

interface ChannelFaderProps {
  deck: DJDeck;
  label: string;       // "A" or "B"
  volume: number;      // 0-1
  onVolumeChange: (volume: number) => void;
  crossfaderCurve: CrossfaderCurve;
  compact?: boolean;
  className?: string;
}

// dB scale markings mapped to linear volume (0-1)
// volume = 10^(dB/20), so 0dB=1.0, -3dB~0.708, -6dB~0.501, -10dB~0.316, -20dB~0.1
// -inf = 0
const FADER_MARKINGS = [
  { label: '0',    db: 0,    pos: 0 },    // top
  { label: '-3',   db: -3,   pos: 0.15 },
  { label: '-6',   db: -6,   pos: 0.3 },
  { label: '-10',  db: -10,  pos: 0.45 },
  { label: '-20',  db: -20,  pos: 0.65 },
  { label: '-inf', db: -Infinity, pos: 1.0 }, // bottom
];

// Convert dB to linear volume
function dbToLinear(db: number): number {
  if (db === -Infinity || db <= -60) return 0;
  return Math.pow(10, db / 20);
}

// Convert linear volume to dB
function linearToDb(linear: number): string {
  if (linear <= 0.0001) return '-inf';
  const db = 20 * Math.log10(linear);
  if (db <= -60) return '-inf';
  return `${Math.round(db)}`;
}

// VU meter color based on level (0-1)
function getVuColor(level: number): string {
  if (level > 0.707) return '#ef4444';   // red > -3dB
  if (level > 0.501) return '#eab308';   // yellow > -6dB
  return '#22c55e';                       // green
}

function getVuColorGradient(level: number): string {
  if (level > 0.707) return 'bg-red-500';
  if (level > 0.501) return 'bg-yellow-500';
  return 'bg-green-500';
}

// Deck color
function getDeckColor(label: string): string {
  return label === 'A' ? '#06b6d4' : '#d946ef'; // cyan : magenta
}

function getDeckColorClass(label: string): string {
  return label === 'A'
    ? 'border-cyan-500 shadow-cyan-500/30'
    : 'border-fuchsia-500 shadow-fuchsia-500/30';
}

function getDeckBgClass(label: string): string {
  return label === 'A' ? 'bg-cyan-500' : 'bg-fuchsia-500';
}

// CrossfaderCurve SVG diagrams
function CrossfaderCurveDiagram({ curve, size = 40 }: { curve: CrossfaderCurve; size?: number }) {
  const paths: Record<CrossfaderCurve, string> = {
    linear:  'M 2,38 L 38,2',
    smooth:  'M 2,38 C 8,38 32,2 38,2',
    cut:     'M 2,38 L 2,28 L 14,28 L 26,10 L 38,10 L 38,2',
    hamster: 'M 38,38 L 2,2',
  };

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="opacity-70">
      <rect x="0" y="0" width="40" height="40" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="1" />
      {/* Grid lines */}
      <line x1="0" y1="20" x2="40" y2="20" stroke="#374151" strokeWidth="0.5" />
      <line x1="20" y1="0" x2="20" y2="40" stroke="#374151" strokeWidth="0.5" />
      {/* Diagonal reference */}
      <line x1="2" y1="38" x2="38" y2="2" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2,2" />
      {/* Curve */}
      <path d={paths[curve]} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
      {/* Endpoints */}
      <circle cx="2" cy="38" r="2.5" fill="#06b6d4" />
      <circle cx="38" cy="2" r="2.5" fill="#d946ef" />
    </svg>
  );
}

export default function ChannelFader({
  deck,
  label,
  volume,
  onVolumeChange,
  crossfaderCurve,
  compact = false,
  className,
}: ChannelFaderProps) {
  // Fader state
  const faderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // VU meter state
  const [vuLevel, setVuLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const peakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Channel controls state
  const [gain, setGain] = useState(1.0);
  const [eqKill, setEqKill] = useState({ hi: false, mid: false, lo: false });
  const [pfl, setPfl] = useState(false);

  // VU meter animation loop
  useEffect(() => {
    let running = true;

    const updateMeter = () => {
      if (!running) return;

      const freqData = deck.getFrequencyData();
      if (freqData.length > 0) {
        // Calculate RMS level from frequency data
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          const val = freqData[i] / 255;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / freqData.length);

        // Scale to match volume fader position
        const level = Math.min(1, rms * 2.5) * volume;
        setVuLevel(level);

        // Peak hold
        if (level > peakLevel) {
          setPeakLevel(level);
          if (peakTimerRef.current) clearTimeout(peakTimerRef.current);
          peakTimerRef.current = setTimeout(() => {
            setPeakLevel(0);
          }, 1000);
        }
      }

      animFrameRef.current = requestAnimationFrame(updateMeter);
    };

    animFrameRef.current = requestAnimationFrame(updateMeter);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (peakTimerRef.current) clearTimeout(peakTimerRef.current);
    };
  }, [deck, volume, peakLevel]);

  // Fader drag handling
  const handleFaderInteraction = useCallback((clientY: number) => {
    if (!faderRef.current) return;
    const rect = faderRef.current.getBoundingClientRect();
    const trackHeight = rect.height;
    const relY = clientY - rect.top;
    const ratio = 1 - Math.max(0, Math.min(1, relY / trackHeight));
    onVolumeChange(ratio);
  }, [onVolumeChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleFaderInteraction(e.clientY);
  }, [handleFaderInteraction]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    handleFaderInteraction(e.clientY);
  }, [isDragging, handleFaderInteraction]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Toggle EQ kill
  const toggleEqKill = (band: 'hi' | 'mid' | 'lo') => {
    setEqKill(prev => {
      const next = { ...prev, [band]: !prev[band] };
      // Apply to deck EQ if eq3 effect exists
      const eqEffect = deck.getEffect('eq3');
      if (eqEffect) {
        const bandName = band === 'hi' ? 'high' : band === 'lo' ? 'low' : 'mid';
        deck.setEffectParameter('eq3', `${bandName}Gain`, next[band] ? 0 : 1);
      }
      return next;
    });
  };

  // Toggle PFL
  const togglePfl = () => {
    setPfl(prev => !prev);
  };

  // Fader handle position (in percentage from top)
  const handlePos = (1 - volume) * 100;
  const deckColor = getDeckColor(label);

  const trackHeight = compact ? 160 : 240;
  const vuBarHeight = compact ? 140 : 220;

  return (
    <div
      className={cn(
        'flex flex-col items-center bg-gray-900/80 rounded-lg border border-gray-700/50',
        'select-none',
        compact ? 'p-1.5 gap-1' : 'p-2 gap-2',
        className
      )}
      data-testid={`channel-fader-${label}`}
    >
      {/* Label */}
      <div
        className="text-[10px] font-bold tracking-wider uppercase"
        style={{ color: deckColor }}
      >
        Ch {label}
      </div>

      {/* Fader + VU meter row */}
      <div className={cn('flex items-end gap-1', compact ? 'h-[160px]' : 'h-[240px]')}>
        {/* VU Meter */}
        <div
          className={cn('relative rounded-sm overflow-hidden', compact ? 'w-2' : 'w-3')}
          style={{ height: vuBarHeight }}
        >
          {/* Track background */}
          <div className="absolute inset-0 bg-gray-800 rounded-sm" />

          {/* Level fill (bottom-up) */}
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 transition-[height] duration-75 rounded-sm',
              getVuColorGradient(vuLevel)
            )}
            style={{
              height: `${vuLevel * 100}%`,
              opacity: deck.isPlaying ? 0.9 : 0.3,
            }}
          />

          {/* Peak indicator */}
          {peakLevel > 0.05 && (
            <div
              className={cn(
                'absolute left-0 right-0 h-[2px] rounded-sm',
                getVuColorGradient(peakLevel)
              )}
              style={{
                bottom: `${peakLevel * 100}%`,
                opacity: 0.9,
                boxShadow: `0 0 4px ${getVuColor(peakLevel)}`,
              }}
            />
          )}

          {/* dB markings on VU (right side) */}
          <div className="absolute inset-0 pointer-events-none">
            {FADER_MARKINGS.map((m) => (
              <div
                key={m.label}
                className="absolute right-0 w-full border-t border-gray-600/40"
                style={{ top: `${m.pos * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Vertical Fader */}
        <div
          ref={faderRef}
          className={cn(
            'relative cursor-pointer touch-none',
            compact ? 'w-6' : 'w-8'
          )}
          style={{ height: vuBarHeight }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          data-testid={`fader-track-${label}`}
        >
          {/* Fader track */}
          <div className="absolute inset-x-1/2 -translate-x-1/2 w-[6px] top-0 bottom-0 bg-gray-700 rounded-full">
            {/* Active portion fill */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-full transition-[height] duration-75"
              style={{
                height: `${volume * 100}%`,
                backgroundColor: deckColor,
                opacity: 0.4,
              }}
            />
          </div>

          {/* dB scale markings */}
          {FADER_MARKINGS.map((m) => (
            <div
              key={m.label}
              className="absolute right-full mr-1 flex items-center h-0 pointer-events-none"
              style={{ top: `${m.pos * 100}%` }}
            >
              <span className="text-[7px] text-gray-500 font-mono whitespace-nowrap -translate-y-1/2">
                {m.label}
              </span>
              <div className="w-1 h-px bg-gray-600 ml-0.5" />
            </div>
          ))}

          {/* Fader handle */}
          <div
            className={cn(
              'absolute left-0 right-0 h-6 -translate-y-1/2 z-10',
              'rounded-md border-2 transition-shadow duration-150',
              isDragging ? 'shadow-lg' : 'shadow-md',
              getDeckColorClass(label)
            )}
            style={{
              top: `${handlePos}%`,
              backgroundColor: '#1f2937',
              boxShadow: isDragging
                ? `0 0 12px ${deckColor}40`
                : `0 0 6px ${deckColor}20`,
            }}
          >
            {/* Grip texture lines */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2px] px-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-full h-[1px] rounded-full"
                  style={{ backgroundColor: deckColor, opacity: 0.6 }}
                />
              ))}
            </div>
          </div>

          {/* Current dB readout */}
          <div
            className="absolute left-full ml-1 -translate-y-1/2 text-[8px] font-mono text-gray-400 pointer-events-none"
            style={{ top: `${handlePos}%` }}
          >
            {linearToDb(volume)}
          </div>
        </div>
      </div>

      {/* Volume label */}
      <div className="text-[8px] text-gray-500 uppercase tracking-wider">Vol</div>

      {/* Gain / Trim control */}
      {!compact && (
        <div className="w-full px-1">
          <div className="text-[8px] text-gray-400 text-center mb-0.5 uppercase tracking-wider">
            Gain
          </div>
          <div className="flex items-center gap-1">
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={gain}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setGain(val);
              }}
              className="w-full h-1.5 appearance-none bg-gray-700 rounded-full cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer"
              style={{
                accentColor: deckColor,
              }}
              data-testid={`gain-trim-${label}`}
            />
            <span className="text-[8px] text-gray-500 font-mono w-6 text-right">
              {gain.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* EQ Kill switches */}
      {!compact && (
        <div className="w-full px-1">
          <div className="text-[8px] text-gray-400 text-center mb-1 uppercase tracking-wider">
            EQ Kill
          </div>
          <div className="flex gap-1 justify-center">
            {(['hi', 'mid', 'lo'] as const).map((band) => (
              <button
                key={band}
                onClick={() => toggleEqKill(band)}
                className={cn(
                  'px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider',
                  'border transition-all duration-100',
                  eqKill[band]
                    ? 'bg-red-600/80 border-red-500 text-white shadow-red-500/30 shadow-sm'
                    : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                )}
                data-testid={`eq-kill-${band}-${label}`}
              >
                {band}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PFL (Pre-Fade Listen) */}
      {!compact && (
        <div className="w-full px-1">
          <button
            onClick={togglePfl}
            className={cn(
              'w-full py-1 rounded text-[9px] font-bold uppercase tracking-wider',
              'border transition-all duration-100',
              pfl
                ? 'bg-amber-600/80 border-amber-500 text-white shadow-amber-500/30 shadow-sm'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            )}
            data-testid={`pfl-${label}`}
          >
            PFL
          </button>
        </div>
      )}

      {/* Crossfader Curve indicator (mini) */}
      {!compact && (
        <div className="w-full px-1 pt-1 border-t border-gray-700/50">
          <div className="text-[7px] text-gray-500 text-center mb-0.5 uppercase tracking-wider">
            Curve
          </div>
          <div className="flex justify-center">
            <CrossfaderCurveDiagram curve={crossfaderCurve} size={32} />
          </div>
          <div className="text-[7px] text-gray-400 text-center capitalize mt-0.5">
            {crossfaderCurve}
          </div>
        </div>
      )}
    </div>
  );
}
