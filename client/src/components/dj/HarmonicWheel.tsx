import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DJDeck, KeyInfo } from '@/lib/djAudio';
import { Music, Sparkles, ArrowUp, ArrowDown, Link2, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Camelot Wheel Data
// ---------------------------------------------------------------------------

interface CamelotEntry {
  camelot: string;
  key: string;
  number: number;
  letter: 'A' | 'B';
}

const CAMELOT_WHEEL: CamelotEntry[] = [
  // Outer ring – Major keys (B)
  { camelot: '1B',  key: 'A\u266D major',  number: 1,  letter: 'B' },
  { camelot: '2B',  key: 'E\u266D major',  number: 2,  letter: 'B' },
  { camelot: '3B',  key: 'B\u266D major',  number: 3,  letter: 'B' },
  { camelot: '4B',  key: 'F major',        number: 4,  letter: 'B' },
  { camelot: '5B',  key: 'C major',        number: 5,  letter: 'B' },
  { camelot: '6B',  key: 'G major',        number: 6,  letter: 'B' },
  { camelot: '7B',  key: 'D major',        number: 7,  letter: 'B' },
  { camelot: '8B',  key: 'A major',        number: 8,  letter: 'B' },
  { camelot: '9B',  key: 'E major',        number: 9,  letter: 'B' },
  { camelot: '10B', key: 'B major',        number: 10, letter: 'B' },
  { camelot: '11B', key: 'F\u266F major',  number: 11, letter: 'B' },
  { camelot: '12B', key: 'D\u266D major',  number: 12, letter: 'B' },
  // Inner ring – Minor keys (A)
  { camelot: '1A',  key: 'F minor',        number: 1,  letter: 'A' },
  { camelot: '2A',  key: 'C minor',        number: 2,  letter: 'A' },
  { camelot: '3A',  key: 'G minor',        number: 3,  letter: 'A' },
  { camelot: '4A',  key: 'D minor',        number: 4,  letter: 'A' },
  { camelot: '5A',  key: 'A minor',        number: 5,  letter: 'A' },
  { camelot: '6A',  key: 'E minor',        number: 6,  letter: 'A' },
  { camelot: '7A',  key: 'B minor',        number: 7,  letter: 'A' },
  { camelot: '8A',  key: 'F\u266F minor',  number: 8,  letter: 'A' },
  { camelot: '9A',  key: 'C\u266F minor',  number: 9,  letter: 'A' },
  { camelot: '10A', key: 'A\u266F minor',  number: 10, letter: 'A' },
  { camelot: '11A', key: 'B\u266D minor',  number: 11, letter: 'A' },
  { camelot: '12A', key: 'G\u266F minor',  number: 12, letter: 'A' },
];

// Build a lookup map
const CAMELOT_MAP: Record<string, CamelotEntry> = {};
CAMELOT_WHEEL.forEach((entry) => {
  CAMELOT_MAP[entry.camelot] = entry;
});

// ---------------------------------------------------------------------------
// Compatibility helpers
// ---------------------------------------------------------------------------

type CompatibilityLevel = 'perfect' | 'adjacent' | 'energy' | 'incompatible';

interface CompatibilityResult {
  level: CompatibilityLevel;
  label: string;
  score: number; // 0-100
  color: string;
  icon: React.ReactNode;
}

function parseCamelot(camelot: string): { number: number; letter: string } | null {
  const match = camelot.match(/(\d+)([AB])/);
  if (!match) return null;
  return { number: parseInt(match[1], 10), letter: match[2] };
}

function getCompatibility(keyA: string | null | undefined, keyB: string | null | undefined): CompatibilityResult {
  if (!keyA || !keyB) {
    return {
      level: 'incompatible',
      label: 'No key data',
      score: 0,
      color: 'text-white/40',
      icon: <AlertTriangle className="w-4 h-4" />,
    };
  }

  const a = parseCamelot(keyA);
  const b = parseCamelot(keyB);

  if (!a || !b) {
    return {
      level: 'incompatible',
      label: 'Invalid key',
      score: 0,
      color: 'text-white/40',
      icon: <AlertTriangle className="w-4 h-4" />,
    };
  }

  // Perfect: same key
  if (keyA === keyB) {
    return { level: 'perfect', label: 'Perfect match', score: 100, color: 'text-green-400', icon: <Sparkles className="w-4 h-4" /> };
  }

  // Same number, different letter (relative major/minor)
  if (a.number === b.number && a.letter !== b.letter) {
    return { level: 'perfect', label: 'Relative major/minor', score: 95, color: 'text-green-400', icon: <Link2 className="w-4 h-4" /> };
  }

  // Adjacent number, same letter
  const numDiff = Math.abs(a.number - b.number);
  const wrappedDiff = Math.min(numDiff, 12 - numDiff);

  if (wrappedDiff === 1 && a.letter === b.letter) {
    return { level: 'adjacent', label: 'Adjacent harmony', score: 80, color: 'text-yellow-400', icon: <Music className="w-4 h-4" /> };
  }

  // Energy boost/drop: adjacent number, different letter
  if (wrappedDiff === 1 && a.letter !== b.letter) {
    // Energy boost: A -> B at next number
    const nextBNum = (a.number % 12) + 1;
    const isBoost = a.letter === 'A' && b.letter === 'B' && b.number === nextBNum;
    if (isBoost) {
      return { level: 'energy', label: 'Energy boost', score: 65, color: 'text-blue-400', icon: <ArrowUp className="w-4 h-4" /> };
    }
    return { level: 'energy', label: 'Energy drop', score: 60, color: 'text-blue-400', icon: <ArrowDown className="w-4 h-4" /> };
  }

  return { level: 'incompatible', label: 'Incompatible', score: 0, color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> };
}

function getCompatibleKeys(camelot: string | null | undefined): {
  perfect: CamelotEntry[];
  adjacent: CamelotEntry[];
  energy: CamelotEntry[];
} {
  const result = { perfect: [] as CamelotEntry[], adjacent: [] as CamelotEntry[], energy: [] as CamelotEntry[] };
  if (!camelot) return result;

  CAMELOT_WHEEL.forEach((entry) => {
    if (entry.camelot === camelot) return; // skip self
    const comp = getCompatibility(camelot, entry.camelot);
    if (comp.level === 'perfect') result.perfect.push(entry);
    else if (comp.level === 'adjacent') result.adjacent.push(entry);
    else if (comp.level === 'energy') result.energy.push(entry);
  });

  return result;
}

// ---------------------------------------------------------------------------
// SVG geometry helpers
// ---------------------------------------------------------------------------

const CX = 200;
const CY = 200;
const OUTER_R = 190;
const INNER_MAJOR_R = 140;
const INNER_MINOR_R = 95;
const CENTER_R = 50;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HarmonicWheelProps {
  deckA?: DJDeck | null;
  deckB?: DJDeck | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HarmonicWheel({ deckA, deckB, className = '' }: HarmonicWheelProps) {
  const [keyInfoA, setKeyInfoA] = useState<KeyInfo | null>(null);
  const [keyInfoB, setKeyInfoB] = useState<KeyInfo | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Register key detection callbacks and seed initial state
  useEffect(() => {
    if (!deckA) { setKeyInfoA(null); return; }
    const analysisA = deckA.getAnalysisState?.();
    if (analysisA?.keyInfo) setKeyInfoA(analysisA.keyInfo);
    deckA.onKeyDetected?.((k: KeyInfo) => setKeyInfoA(k));
  }, [deckA]);

  useEffect(() => {
    if (!deckB) { setKeyInfoB(null); return; }
    const analysisB = deckB.getAnalysisState?.();
    if (analysisB?.keyInfo) setKeyInfoB(analysisB.keyInfo);
    deckB.onKeyDetected?.((k: KeyInfo) => setKeyInfoB(k));
  }, [deckB]);

  const camelotA = keyInfoA?.camelot ?? null;
  const camelotB = keyInfoB?.camelot ?? null;

  // Compatibility
  const compatibility = useMemo(() => getCompatibility(camelotA, camelotB), [camelotA, camelotB]);
  const compatibleKeysA = useMemo(() => getCompatibleKeys(camelotA), [camelotA]);

  // Determine highlight status for each segment
  const getSegmentHighlight = useCallback(
    (camelot: string): 'deckA' | 'deckB' | 'compatible' | 'hovered' | 'none' => {
      if (camelotA && camelot === camelotA) return 'deckA';
      if (camelotB && camelot === camelotB) return 'deckB';
      if (hoveredKey && camelot === hoveredKey) return 'hovered';
      if (camelotA) {
        const isCompat = compatibleKeysA.perfect.some((e) => e.camelot === camelot) ||
          compatibleKeysA.adjacent.some((e) => e.camelot === camelot) ||
          compatibleKeysA.energy.some((e) => e.camelot === camelot);
        if (isCompat) return 'compatible';
      }
      return 'none';
    },
    [camelotA, camelotB, hoveredKey, compatibleKeysA],
  );

  const segmentColor = (highlight: ReturnType<typeof getSegmentHighlight>, letter: 'A' | 'B') => {
    switch (highlight) {
      case 'deckA':
        return 'rgba(0, 229, 255, 0.55)';
      case 'deckB':
        return 'rgba(255, 0, 229, 0.55)';
      case 'compatible':
        return letter === 'B' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.18)';
      case 'hovered':
        return 'rgba(255, 255, 255, 0.15)';
      default:
        return letter === 'B' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)';
    }
  };

  const strokeColor = (highlight: ReturnType<typeof getSegmentHighlight>) => {
    switch (highlight) {
      case 'deckA':
        return '#00e5ff';
      case 'deckB':
        return '#ff00e5';
      case 'compatible':
        return '#22c55e';
      case 'hovered':
        return 'rgba(255,255,255,0.5)';
      default:
        return 'rgba(255,255,255,0.08)';
    }
  };

  // Each segment spans 30 degrees
  const SEGMENT_DEG = 360 / 12;

  // Build segments
  const majorEntries = CAMELOT_WHEEL.filter((e) => e.letter === 'B').sort((a, b) => a.number - b.number);
  const minorEntries = CAMELOT_WHEEL.filter((e) => e.letter === 'A').sort((a, b) => a.number - b.number);

  return (
    <Card className={`glass-panel neon-border ${className}`}>
      <CardContent className="p-4 space-y-4">
        {/* Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Music className="w-4 h-4 text-cyan-400/60" />
            <span className="text-sm text-cyan-400/60 uppercase tracking-wide">Harmonic Mixing</span>
          </div>
        </div>

        {/* Wheel SVG */}
        <div className="flex justify-center">
          <svg
            viewBox="0 0 400 400"
            width="340"
            height="340"
            className="drop-shadow-lg"
            style={{ filter: 'drop-shadow(0 0 12px rgba(0,229,255,0.15))' }}
          >
            {/* Background circle */}
            <circle cx={CX} cy={CY} r={OUTER_R + 4} fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <circle cx={CX} cy={CY} r={CENTER_R} fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* Major key segments (outer ring) */}
            {majorEntries.map((entry, i) => {
              const startAngle = i * SEGMENT_DEG;
              const endAngle = startAngle + SEGMENT_DEG;
              const highlight = getSegmentHighlight(entry.camelot);
              const midAngle = startAngle + SEGMENT_DEG / 2;
              const labelR = (OUTER_R + INNER_MAJOR_R) / 2;
              const labelPos = polarToCartesian(CX, CY, labelR, midAngle);

              return (
                <g key={entry.camelot}>
                  <motion.path
                    d={describeArc(CX, CY, OUTER_R, INNER_MAJOR_R, startAngle, endAngle)}
                    fill={segmentColor(highlight, 'B')}
                    stroke={strokeColor(highlight)}
                    strokeWidth={highlight !== 'none' ? 2 : 0.5}
                    onMouseEnter={() => setHoveredKey(entry.camelot)}
                    onMouseLeave={() => setHoveredKey(null)}
                    initial={false}
                    animate={{
                      fill: segmentColor(highlight, 'B'),
                      stroke: strokeColor(highlight),
                      strokeWidth: highlight !== 'none' ? 2 : 0.5,
                    }}
                    transition={{ duration: 0.25 }}
                    style={{ cursor: 'pointer' }}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={highlight !== 'none' ? '#fff' : 'rgba(255,255,255,0.65)'}
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight={highlight !== 'none' ? 'bold' : 'normal'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {entry.camelot}
                  </text>
                </g>
              );
            })}

            {/* Minor key segments (inner ring) */}
            {minorEntries.map((entry, i) => {
              const startAngle = i * SEGMENT_DEG;
              const endAngle = startAngle + SEGMENT_DEG;
              const highlight = getSegmentHighlight(entry.camelot);
              const midAngle = startAngle + SEGMENT_DEG / 2;
              const labelR = (INNER_MAJOR_R + INNER_MINOR_R) / 2;
              const labelPos = polarToCartesian(CX, CY, labelR, midAngle);

              return (
                <g key={entry.camelot}>
                  <motion.path
                    d={describeArc(CX, CY, INNER_MAJOR_R, INNER_MINOR_R, startAngle, endAngle)}
                    fill={segmentColor(highlight, 'A')}
                    stroke={strokeColor(highlight)}
                    strokeWidth={highlight !== 'none' ? 2 : 0.5}
                    onMouseEnter={() => setHoveredKey(entry.camelot)}
                    onMouseLeave={() => setHoveredKey(null)}
                    initial={false}
                    animate={{
                      fill: segmentColor(highlight, 'A'),
                      stroke: strokeColor(highlight),
                      strokeWidth: highlight !== 'none' ? 2 : 0.5,
                    }}
                    transition={{ duration: 0.25 }}
                    style={{ cursor: 'pointer' }}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={highlight !== 'none' ? '#fff' : 'rgba(255,255,255,0.55)'}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight={highlight !== 'none' ? 'bold' : 'normal'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {entry.camelot}
                  </text>
                </g>
              );
            })}

            {/* Tick marks between segments */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = i * SEGMENT_DEG;
              const inner = polarToCartesian(CX, CY, CENTER_R, angle);
              const outer = polarToCartesian(CX, CY, OUTER_R, angle);
              return (
                <line
                  key={`tick-${i}`}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="0.5"
                />
              );
            })}

            {/* Ring labels */}
            <text x={CX} y={CY - 18} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
              MINOR
            </text>
            <text x={CX} y={CY + 22} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
              MAJOR
            </text>

            {/* Hover tooltip */}
            <AnimatePresence>
              {hoveredKey && CAMELOT_MAP[hoveredKey] && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <rect
                    x={CX - 72}
                    y={CY - 10}
                    width="144"
                    height="20"
                    rx="4"
                    fill="rgba(0,0,0,0.85)"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={CX}
                    y={CY + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#fff"
                    fontSize="11"
                    fontFamily="monospace"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {hoveredKey} = {CAMELOT_MAP[hoveredKey].key}
                  </text>
                </motion.g>
              )}
            </AnimatePresence>

            {/* Deck indicators in center */}
            {(camelotA || camelotB) && (
              <g>
                {camelotA && (
                  <text x={CX} y={camelotB ? CY - 4 : CY + 1} textAnchor="middle" dominantBaseline="central" fill="#00e5ff" fontSize="13" fontFamily="monospace" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                    A: {camelotA}
                  </text>
                )}
                {camelotB && (
                  <text x={CX} y={camelotA ? CY + 10 : CY + 1} textAnchor="middle" dominantBaseline="central" fill="#ff00e5" fontSize="13" fontFamily="monospace" fontWeight="bold" style={{ pointerEvents: 'none' }}>
                    B: {camelotB}
                  </text>
                )}
              </g>
            )}
          </svg>
        </div>

        {/* Compatibility result */}
        {(camelotA || camelotB) && (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge
                variant="outline"
                className={`border-white/10 ${compatibility.color} bg-black/30`}
              >
                <span className="flex items-center gap-1.5">
                  {compatibility.icon}
                  {compatibility.label}
                </span>
              </Badge>
              <div className="text-xs text-white/30">Score: {compatibility.score}%</div>
            </div>

            {/* Score bar */}
            <div className="w-full max-w-[200px] mx-auto bg-white/5 rounded-full h-1.5">
              <motion.div
                className={`h-1.5 rounded-full ${
                  compatibility.score >= 90
                    ? 'bg-green-500'
                    : compatibility.score >= 60
                      ? 'bg-yellow-500'
                      : compatibility.score > 0
                        ? 'bg-blue-500'
                        : 'bg-red-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${compatibility.score}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Deck key badges */}
        <div className="flex justify-center gap-3 flex-wrap">
          {keyInfoA && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs text-white/50">A:</span>
              <Badge variant="outline" className="bg-cyan-950/50 border-cyan-700/40 text-cyan-300 text-xs">
                {keyInfoA.camelot}
              </Badge>
              <span className="text-xs text-white/30">{keyInfoA.detected}</span>
            </div>
          )}
          {keyInfoB && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-fuchsia-400" />
              <span className="text-xs text-white/50">B:</span>
              <Badge variant="outline" className="bg-fuchsia-950/50 border-fuchsia-700/40 text-fuchsia-300 text-xs">
                {keyInfoB.camelot}
              </Badge>
              <span className="text-xs text-white/30">{keyInfoB.detected}</span>
            </div>
          )}
        </div>

        {/* Compatible keys list */}
        {camelotA && (
          <div className="space-y-2">
            <div className="text-xs text-white/40 text-center uppercase tracking-wide">Compatible Keys</div>

            {/* Perfect matches */}
            {compatibleKeysA.perfect.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {compatibleKeysA.perfect.map((entry) => (
                  <motion.div key={entry.camelot} whileHover={{ scale: 1.1 }} className="flex items-center gap-1">
                    <Badge className="bg-green-900/50 border-green-600/40 text-green-300 text-xs">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {entry.camelot}
                    </Badge>
                    <span className="text-[10px] text-white/30">{entry.key}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Adjacent */}
            {compatibleKeysA.adjacent.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {compatibleKeysA.adjacent.map((entry) => (
                  <motion.div key={entry.camelot} whileHover={{ scale: 1.1 }} className="flex items-center gap-1">
                    <Badge className="bg-yellow-900/50 border-yellow-600/40 text-yellow-300 text-xs">
                      <Music className="w-3 h-3 mr-1" />
                      {entry.camelot}
                    </Badge>
                    <span className="text-[10px] text-white/30">{entry.key}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Energy shift */}
            {compatibleKeysA.energy.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {compatibleKeysA.energy.map((entry) => (
                  <motion.div key={entry.camelot} whileHover={{ scale: 1.1 }} className="flex items-center gap-1">
                    <Badge className="bg-blue-900/50 border-blue-600/40 text-blue-300 text-xs">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      {entry.camelot}
                    </Badge>
                    <span className="text-[10px] text-white/30">{entry.key}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-4 text-[10px] text-white/30 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Perfect</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Adjacent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Energy</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Deck A</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fuchsia-400" /> Deck B</span>
        </div>
      </CardContent>
    </Card>
  );
}
