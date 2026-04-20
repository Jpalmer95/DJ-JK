import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Upload,
} from 'lucide-react';
import { StepSequencer, StepSequencerTrack } from '@/lib/stepSequencer';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StepSequencerUIProps {
  sequencer: StepSequencer;
  bpm: number;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_STEPS = 32;
const VISIBLE_STEPS = 16;
const TRACK_COLORS = [
  '#00f0ff', // cyan
  '#ff00e5', // fuchsia
  '#a855f7', // violet
  '#22d3ee', // sky
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
];

const PATTERN_LENGTH_OPTIONS = [8, 16, 32];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StepSequencerUI({
  sequencer,
  bpm,
  compact = false,
}: StepSequencerUIProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tracks, setTracks] = useState<StepSequencerTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [swing, setSwing] = useState(0);
  const [patternLength, setPatternLength] = useState(16);
  const [activeSampleTrack, setActiveSampleTrack] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Sync tracks from sequencer --
  const refreshTracks = useCallback(() => {
    setTracks(sequencer.getTracks());
    setSwing(sequencer.getSwing());
  }, [sequencer]);

  useEffect(() => {
    refreshTracks();
  }, [refreshTracks]);

  // -- Subscribe to step callbacks for visual sync --
  useEffect(() => {
    const unsub = sequencer.getStepCallback((step: number) => {
      setCurrentStep(step);
    });
    return unsub;
  }, [sequencer]);

  // -- Poll playing state --
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(sequencer.isPlaying);
    }, 100);
    return () => clearInterval(interval);
  }, [sequencer]);

  // -- Transport --
  const handlePlayStop = useCallback(() => {
    if (sequencer.isPlaying) {
      sequencer.stop();
      setCurrentStep(0);
    } else {
      sequencer.play();
    }
    setIsPlaying(sequencer.isPlaying);
  }, [sequencer]);

  // -- Swing --
  const handleSwingChange = useCallback(
    (value: number[]) => {
      const val = value[0] / 100;
      setSwing(val);
      sequencer.setSwing(val);
    },
    [sequencer]
  );

  // -- Pattern length --
  const handlePatternLengthChange = useCallback(
    (length: number) => {
      setPatternLength(length);
      // Apply to all tracks
      for (const track of tracks) {
        sequencer.setPatternLength(track.id, length);
      }
      refreshTracks();
    },
    [sequencer, tracks, refreshTracks]
  );

  // -- Toggle step --
  const handleToggleStep = useCallback(
    (trackId: string, step: number) => {
      sequencer.toggleStep(trackId, step);
      refreshTracks();
    },
    [sequencer, refreshTracks]
  );

  // -- Track controls --
  const handleMute = useCallback(
    (trackId: string, currentMute: boolean) => {
      sequencer.muteTrack(trackId, !currentMute);
      refreshTracks();
    },
    [sequencer, refreshTracks]
  );

  const handleSolo = useCallback(
    (trackId: string, currentSolo: boolean) => {
      sequencer.soloTrack(trackId, !currentSolo);
      refreshTracks();
    },
    [sequencer, refreshTracks]
  );

  const handleVolumeChange = useCallback(
    (trackId: string, volume: number[]) => {
      sequencer.setTrackVolume(trackId, volume[0] / 100);
      refreshTracks();
    },
    [sequencer, refreshTracks]
  );

  const handleClearTrack = useCallback(
    (trackId: string) => {
      sequencer.clearTrack(trackId);
      refreshTracks();
    },
    [sequencer, refreshTracks]
  );

  const handleClearAll = useCallback(() => {
    sequencer.clearAll();
    refreshTracks();
  }, [sequencer, refreshTracks]);

  // -- Sample loading --
  const handleTrackNameClick = useCallback((trackId: string) => {
    setActiveSampleTrack(trackId);
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeSampleTrack) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioCtx.close();

        sequencer.loadSample(activeSampleTrack, audioBuffer);
        refreshTracks();
      } catch (err) {
        console.error('Failed to load sample:', err);
      }

      setActiveSampleTrack(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [activeSampleTrack, sequencer, refreshTracks]
  );

  // -- Track color helpers --
  const getTrackColor = (track: StepSequencerTrack, index: number): string => {
    return track.color || TRACK_COLORS[index % TRACK_COLORS.length];
  };

  // -- Render --
  const cellSize = compact ? 'w-6 h-6' : 'w-8 h-8';
  const headerHeight = compact ? 'h-6' : 'h-8';

  return (
    <div className="bg-gray-900 rounded-lg p-3 select-none font-mono text-xs">
      {/* Hidden file input for sample loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Transport controls */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {/* Play/Stop */}
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlayStop}
          className={`border-gray-700 ${
            isPlaying
              ? 'bg-red-600/20 text-red-400 border-red-600 hover:bg-red-600/30'
              : 'bg-emerald-600/20 text-emerald-400 border-emerald-600 hover:bg-emerald-600/30'
          }`}
        >
          {isPlaying ? <Square className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
          {isPlaying ? 'Stop' : 'Play'}
        </Button>

        {/* BPM display */}
        <div className="flex items-center gap-1.5 bg-gray-800 rounded px-2 py-1 border border-gray-700">
          <span className="text-gray-500">BPM</span>
          <span className="text-cyan-400 font-bold">{bpm}</span>
        </div>

        {/* Swing slider */}
        <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1 border border-gray-700">
          <span className="text-gray-500">Swing</span>
          <Slider
            value={[swing * 100]}
            max={100}
            step={1}
            className="w-20 [&_[role=slider]]:bg-cyan-500 [&_[role=slider]]:border-cyan-400 [&_[data-orientation]]:bg-gray-700"
            onValueChange={handleSwingChange}
          />
          <span className="text-gray-400 w-8 text-right">{Math.round(swing * 100)}%</span>
        </div>

        {/* Pattern length selector */}
        <div className="flex items-center gap-1 bg-gray-800 rounded px-2 py-1 border border-gray-700">
          <span className="text-gray-500 mr-1">Steps</span>
          {PATTERN_LENGTH_OPTIONS.map((len) => (
            <Button
              key={len}
              size="sm"
              variant="outline"
              onClick={() => handlePatternLengthChange(len)}
              className={`h-6 px-2 text-xs border-gray-600 ${
                patternLength === len
                  ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500'
                  : 'text-gray-400 hover:text-cyan-400 hover:border-cyan-700'
              }`}
            >
              {len}
            </Button>
          ))}
        </div>

        {/* Clear all */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleClearAll}
          className="border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-700 hover:bg-red-900/20"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Clear All
        </Button>
      </div>

      {/* Step number headers */}
      <div className="flex mb-1">
        {/* Spacer for track controls column */}
        <div className="w-48 shrink-0" />

        {/* Step numbers */}
        <div className="flex gap-0.5">
          {Array.from({ length: VISIBLE_STEPS }, (_, i) => {
            const isBeat = (i + 1) % 4 === 0;
            const isBar = (i + 1) % 16 === 0;
            return (
              <div
                key={i}
                className={`${cellSize} flex items-center justify-center text-[9px] ${
                  isBar
                    ? 'text-cyan-400 font-bold'
                    : isBeat
                      ? 'text-gray-400'
                      : 'text-gray-600'
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracks */}
      <div className="flex flex-col gap-0.5">
        {tracks.map((track, trackIdx) => {
          const color = getTrackColor(track, trackIdx);

          return (
            <div key={track.id} className="flex items-center gap-0.5">
              {/* Track controls */}
              <div
                className="w-48 shrink-0 flex items-center gap-1 px-1 py-0.5 rounded bg-gray-800/50"
                style={{ borderLeft: `2px solid ${color}` }}
              >
                {/* Color dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />

                {/* Track name (click to load sample) */}
                <button
                  onClick={() => handleTrackNameClick(track.id)}
                  className="flex-1 text-left text-gray-300 hover:text-white truncate cursor-pointer bg-transparent border-none p-0 text-xs"
                  title="Click to load sample"
                >
                  {track.sampleBuffer ? (
                    track.name
                  ) : (
                    <span className="text-gray-600 italic">
                      {track.name} <Upload className="w-2.5 h-2.5 inline" />
                    </span>
                  )}
                </button>

                {/* Mute button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMute(track.id, track.mute)}
                  className={`h-5 w-6 p-0 text-[9px] border-gray-600 ${
                    track.mute
                      ? 'bg-red-600/30 text-red-400 border-red-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title="Mute"
                >
                  M
                </Button>

                {/* Solo button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSolo(track.id, track.solo)}
                  className={`h-5 w-6 p-0 text-[9px] border-gray-600 ${
                    track.solo
                      ? 'bg-yellow-600/30 text-yellow-400 border-yellow-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title="Solo"
                >
                  S
                </Button>

                {/* Volume slider */}
                <div className="flex items-center gap-0.5 w-14">
                  {track.mute ? (
                    <VolumeX className="w-3 h-3 text-gray-600 shrink-0" />
                  ) : (
                    <Volume2 className="w-3 h-3 text-gray-500 shrink-0" style={{ color: track.mute ? undefined : color }} />
                  )}
                  <Slider
                    value={[track.volume * 100]}
                    max={100}
                    step={1}
                    className="flex-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[data-orientation]]:bg-gray-700"
                    onValueChange={(v) => handleVolumeChange(track.id, v)}
                  />
                </div>

                {/* Clear track button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClearTrack(track.id)}
                  className="h-5 w-5 p-0 border-gray-600 text-gray-600 hover:text-red-400 hover:border-red-700"
                  title="Clear track"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </Button>
              </div>

              {/* Step cells */}
              <div className="flex gap-0.5">
                {Array.from({ length: VISIBLE_STEPS }, (_, stepIdx) => {
                  const isActive = track.steps[stepIdx] ?? false;
                  const isCurrentCol = stepIdx === currentStep % VISIBLE_STEPS && isPlaying;
                  const isBeat = (stepIdx + 1) % 4 === 0;
                  const isBar = (stepIdx + 1) % 16 === 0;

                  // Determine border for beat markers
                  let borderClass = 'border-gray-800';
                  if (isBar) borderClass = 'border-gray-600';
                  else if (isBeat) borderClass = 'border-gray-700';

                  return (
                    <motion.button
                      key={stepIdx}
                      className={`${cellSize} rounded border ${borderClass} cursor-pointer transition-colors relative overflow-hidden`}
                      style={
                        isActive
                          ? {
                              backgroundColor: `${color}33`,
                              borderColor: color,
                              boxShadow: `0 0 8px ${color}66, inset 0 0 6px ${color}22`,
                            }
                          : isCurrentCol
                            ? {
                                backgroundColor: 'rgba(255,255,255,0.06)',
                                borderColor: isBar ? '#4b5563' : isBeat ? '#374151' : '#1f2937',
                              }
                            : {
                                backgroundColor: isCurrentCol ? 'rgba(255,255,255,0.04)' : 'transparent',
                              }
                      }
                      onClick={() => handleToggleStep(track.id, stepIdx)}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      {/* Active step glow dot */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-1 rounded-sm"
                          style={{ backgroundColor: color, opacity: 0.7 }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.7 }}
                          transition={{ duration: 0.1 }}
                        />
                      )}

                      {/* Current step overlay indicator */}
                      {isCurrentCol && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-0.5"
                          style={{ backgroundColor: isActive ? color : 'rgba(255,255,255,0.3)' }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {tracks.length === 0 && (
        <div className="text-center text-gray-600 py-8">
          No tracks added. Add tracks to the sequencer to begin.
        </div>
      )}
    </div>
  );
}
