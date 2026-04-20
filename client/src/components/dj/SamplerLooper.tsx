import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Circle,
  Square,
  Play,
  Pause,
  Trash2,
  RotateCw,
  Volume2,
  VolumeX,
  Disc,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { DJMixer } from '@/lib/djAudio';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SamplerLooperProps {
  mixer: DJMixer;
  bpm: number;
  compact?: boolean;
}

interface SamplerSlot {
  id: number;
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  isLooping: boolean;
  isRecording: boolean;
  volume: number;
  recordedBpm: number;
  name: string;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SLOT_COLORS = [
  { bg: 'bg-pink-500/10', border: 'border-pink-500/40', accent: '#ec4899', glow: 'shadow-pink-500/20' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', accent: '#06b6d4', glow: 'shadow-cyan-500/20' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500/40', accent: '#8b5cf6', glow: 'shadow-violet-500/20' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/40', accent: '#f59e0b', glow: 'shadow-amber-500/20' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', accent: '#10b981', glow: 'shadow-emerald-500/20' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/40', accent: '#f43f5e', glow: 'shadow-rose-500/20' },
  { bg: 'bg-sky-500/10', border: 'border-sky-500/40', accent: '#0ea5e9', glow: 'shadow-sky-500/20' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/40', accent: '#f97316', glow: 'shadow-orange-500/20' },
];

const BAR_OPTIONS = [
  { label: '1 bar', bars: 1 },
  { label: '2 bars', bars: 2 },
  { label: '4 bars', bars: 4 },
  { label: '8 bars', bars: 8 },
  { label: 'Manual', bars: 0 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDuration(seconds: number): string {
  if (seconds < 10) return `${seconds.toFixed(2)}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

function calcBarDuration(bpm: number, bars: number): number {
  // 1 bar = 4 beats, beat duration = 60 / bpm
  return (4 * 60 * bars) / bpm;
}

// ---------------------------------------------------------------------------
// Waveform mini visualizer
// ---------------------------------------------------------------------------
function WaveformPreview({
  audioBuffer,
  accentColor,
  isPlaying,
  compact,
}: {
  audioBuffer: AudioBuffer;
  accentColor: string;
  isPlaying: boolean;
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = audioBuffer.getChannelData(0);
    const barCount = compact ? 16 : 32;
    const blockSize = Math.floor(data.length / barCount);
    const bars: number[] = [];

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(data[i * blockSize + j] || 0);
      }
      bars.push(sum / blockSize);
    }

    const maxVal = Math.max(...bars, 0.01);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barW = w / barCount;
      const gap = 1;

      for (let i = 0; i < barCount; i++) {
        const normalized = bars[i] / maxVal;
        let barH = Math.max(normalized * h * 0.9, 2);

        // Animate if playing
        if (isPlaying) {
          const wave = Math.sin(phaseRef.current + i * 0.4) * 0.15;
          barH = Math.max(barH * (0.85 + wave), 2);
        }

        const x = i * barW + gap / 2;
        const y = (h - barH) / 2;

        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.7 + normalized * 0.3;
        ctx.fillRect(x, y, barW - gap, barH);
      }

      ctx.globalAlpha = 1;

      if (isPlaying) {
        phaseRef.current += 0.08;
        animRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    if (isPlaying) {
      animRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [audioBuffer, accentColor, isPlaying, compact]);

  return (
    <canvas
      ref={canvasRef}
      width={compact ? 120 : 200}
      height={compact ? 28 : 40}
      className="rounded"
    />
  );
}

// ---------------------------------------------------------------------------
// Recording indicator pulse
// ---------------------------------------------------------------------------
function RecordingPulse({ accentColor }: { accentColor: string }) {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute w-6 h-6 rounded-full"
        style={{ backgroundColor: '#ef4444' }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sampler Slot Component
// ---------------------------------------------------------------------------
function SamplerSlotView({
  slot,
  color,
  bpm,
  compact,
  onRecord,
  onStopRecord,
  onPlay,
  onStop,
  onDelete,
  onToggleLoop,
  onVolumeChange,
}: {
  slot: SamplerSlot;
  color: (typeof SLOT_COLORS)[number];
  bpm: number;
  compact?: boolean;
  onRecord: (id: number) => void;
  onStopRecord: (id: number) => void;
  onPlay: (id: number) => void;
  onStop: (id: number) => void;
  onDelete: (id: number) => void;
  onToggleLoop: (id: number) => void;
  onVolumeChange: (id: number, vol: number) => void;
}) {
  const isEmpty = !slot.audioBuffer;
  const duration = slot.audioBuffer?.duration ?? 0;

  // Calculate playback rate for BPM sync
  const playbackRate =
    slot.audioBuffer && slot.recordedBpm > 0 ? bpm / slot.recordedBpm : 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative rounded-lg border transition-all duration-200',
        color.bg,
        color.border,
        slot.isPlaying && `shadow-lg ${color.glow}`,
        slot.isRecording && 'border-red-500/60 shadow-lg shadow-red-500/20',
        compact ? 'p-2' : 'p-3'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {slot.isRecording ? (
            <RecordingPulse accentColor={color.accent} />
          ) : (
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isEmpty ? '#4b5563' : color.accent }}
            />
          )}
          <span
            className={cn(
              'font-mono font-semibold',
              compact ? 'text-[10px]' : 'text-xs'
            )}
            style={{ color: isEmpty ? '#6b7280' : color.accent }}
          >
            {isEmpty ? `Slot ${slot.id + 1} — Empty` : slot.name}
          </span>
        </div>

        {!isEmpty && !compact && (
          <span className="text-[10px] text-gray-500 font-mono">
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Waveform or empty state */}
      {slot.audioBuffer ? (
        <div className="mb-2 flex items-center justify-center bg-black/30 rounded p-1">
          <WaveformPreview
            audioBuffer={slot.audioBuffer}
            accentColor={color.accent}
            isPlaying={slot.isPlaying}
            compact={compact}
          />
        </div>
      ) : (
        <div
          className={cn(
            'mb-2 flex items-center justify-center bg-black/20 rounded border border-dashed border-gray-700/50',
            compact ? 'h-8' : 'h-12'
          )}
        >
          {slot.isRecording ? (
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              <span className="text-[10px] text-red-400 font-mono">
                Recording…
              </span>
            </div>
          ) : (
            <Disc className="w-4 h-4 text-gray-700" />
          )}
        </div>
      )}

      {/* BPM sync indicator */}
      {!isEmpty && slot.recordedBpm > 0 && (
        <div className="mb-1 flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-[9px] text-gray-500 font-mono">
            {slot.recordedBpm.toFixed(0)} BPM
            {Math.abs(playbackRate - 1) > 0.01 && (
              <span
                className="ml-1"
                style={{ color: playbackRate > 1 ? '#f59e0b' : '#06b6d4' }}
              >
                ({playbackRate > 1 ? '+' : ''}
                {((playbackRate - 1) * 100).toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Volume slider */}
      {!isEmpty && (
        <div className="mb-2 flex items-center gap-1.5">
          {slot.volume === 0 ? (
            <VolumeX className="w-3 h-3 text-gray-500" />
          ) : (
            <Volume2 className="w-3 h-3 text-gray-500" />
          )}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={slot.volume}
            onChange={(e) => onVolumeChange(slot.id, parseFloat(e.target.value))}
            className="flex-1 h-1 appearance-none bg-gray-700 rounded-full cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                       [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full"
            style={{
              accentColor: color.accent,
            }}
          />
          <span className="text-[9px] text-gray-500 font-mono w-6 text-right">
            {Math.round(slot.volume * 100)}
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Record button */}
        <button
          onClick={() =>
            slot.isRecording ? onStopRecord(slot.id) : onRecord(slot.id)
          }
          className={cn(
            'flex items-center justify-center rounded transition-colors',
            compact ? 'w-6 h-6' : 'w-7 h-7',
            slot.isRecording
              ? 'bg-red-500/30 text-red-400 hover:bg-red-500/50'
              : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-red-400'
          )}
          title={slot.isRecording ? 'Stop recording' : 'Record'}
        >
          {slot.isRecording ? (
            <Square className="w-3 h-3 fill-current" />
          ) : (
            <Circle className="w-3 h-3 fill-current" />
          )}
        </button>

        {/* Play / Stop */}
        {slot.audioBuffer && (
          <button
            onClick={() => (slot.isPlaying ? onStop(slot.id) : onPlay(slot.id))}
            className={cn(
              'flex items-center justify-center rounded transition-colors',
              compact ? 'w-6 h-6' : 'w-7 h-7',
              slot.isPlaying
                ? 'bg-opacity-30 text-white'
                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white'
            )}
            style={
              slot.isPlaying ? { backgroundColor: `${color.accent}33`, color: color.accent } : {}
            }
            title={slot.isPlaying ? 'Stop' : 'Play'}
          >
            {slot.isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
          </button>
        )}

        {/* Loop toggle */}
        {slot.audioBuffer && (
          <button
            onClick={() => onToggleLoop(slot.id)}
            className={cn(
              'flex items-center justify-center rounded transition-colors',
              compact ? 'w-6 h-6' : 'w-7 h-7',
              slot.isLooping
                ? 'bg-opacity-30 text-white'
                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white'
            )}
            style={
              slot.isLooping ? { backgroundColor: `${color.accent}33`, color: color.accent } : {}
            }
            title={slot.isLooping ? 'Disable loop' : 'Enable loop'}
          >
            <RotateCw className="w-3 h-3" />
          </button>
        )}

        {/* Delete */}
        {slot.audioBuffer && !slot.isRecording && (
          <button
            onClick={() => onDelete(slot.id)}
            className={cn(
              'flex items-center justify-center rounded transition-colors',
              compact ? 'w-6 h-6' : 'w-7 h-7',
              'bg-gray-800/60 text-gray-400 hover:bg-red-500/20 hover:text-red-400'
            )}
            title="Delete sample"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main SamplerLooper Component
// ---------------------------------------------------------------------------
export default function SamplerLooper({
  mixer,
  bpm,
  compact = false,
}: SamplerLooperProps) {
  // Initialize 8 sampler slots
  const [slots, setSlots] = useState<SamplerSlot[]>(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      audioBuffer: null,
      isPlaying: false,
      isLooping: false,
      isRecording: false,
      volume: 0.8,
      recordedBpm: 0,
      name: `Slot ${i + 1}`,
      sourceNode: null,
      gainNode: null,
    }))
  );

  const [recordBars, setRecordBars] = useState<number>(4); // default 4 bars
  const [showBarMenu, setShowBarMenu] = useState(false);

  // Refs for recording
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingRef = useRef<{
    slotId: number;
    scriptNode: ScriptProcessorNode;
    chunks: Float32Array[];
    startTime: number;
    timeoutId: ReturnType<typeof setTimeout> | null;
  } | null>(null);

  // Get or create AudioContext
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // ---------------------------------------------------------------------------
  // Recording logic
  // ---------------------------------------------------------------------------
  const startRecording = useCallback(
    (slotId: number) => {
      const ctx = getAudioContext();
      const masterTap = mixer.getMasterRecordingTapNode();
      if (!masterTap) {
        console.warn('Master recording tap not available');
        return;
      }

      // Stop any existing recording
      if (recordingRef.current) {
        stopRecording(recordingRef.current.slotId);
      }

      // Create script processor for capturing audio
      const bufferSize = 4096;
      const scriptNode = ctx.createScriptProcessor(bufferSize, 2, 2);
      const chunks: Float32Array[] = [];

      scriptNode.onaudioprocess = (e) => {
        const inputL = e.inputBuffer.getChannelData(0);
        const inputR =
          e.inputBuffer.numberOfChannels > 1
            ? e.inputBuffer.getChannelData(1)
            : inputL;
        // Store interleaved samples
        const interleaved = new Float32Array(inputL.length * 2);
        for (let i = 0; i < inputL.length; i++) {
          interleaved[i * 2] = inputL[i];
          interleaved[i * 2 + 1] = inputR[i];
        }
        chunks.push(interleaved);
      };

      // Connect: master tap -> scriptNode -> silent gain -> destination (so it processes)
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      masterTap.connect(scriptNode);
      scriptNode.connect(silentGain);
      silentGain.connect(ctx.destination);

      // Mark slot as recording
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, isRecording: true } : s
        )
      );

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      // Auto-stop after bar duration
      if (recordBars > 0) {
        const duration = calcBarDuration(bpm, recordBars);
        timeoutId = setTimeout(() => {
          stopRecording(slotId);
        }, duration * 1000);
      }

      recordingRef.current = {
        slotId,
        scriptNode,
        chunks,
        startTime: ctx.currentTime,
        timeoutId,
      };
    },
    [mixer, bpm, recordBars, getAudioContext]
  );

  const stopRecording = useCallback(
    (slotId: number) => {
      const rec = recordingRef.current;
      if (!rec || rec.slotId !== slotId) return;

      if (rec.timeoutId) clearTimeout(rec.timeoutId);

      const ctx = getAudioContext();
      const elapsed = ctx.currentTime - rec.startTime;

      // Disconnect nodes
      try {
        const masterTap = mixer.getMasterRecordingTapNode();
        if (masterTap) masterTap.disconnect(rec.scriptNode);
        rec.scriptNode.disconnect();
      } catch {
        // ignore disconnect errors
      }

      // Reconstruct audio buffer from chunks
      const { chunks } = rec;
      if (chunks.length === 0) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, isRecording: false } : s
          )
        );
        recordingRef.current = null;
        return;
      }

      const samplesPerChunk = chunks[0].length / 2; // interleaved stereo
      const totalSamples = chunks.reduce((sum, c) => sum + c.length / 2, 0);
      const audioBuffer = ctx.createBuffer(2, totalSamples, ctx.sampleRate);
      const channelL = audioBuffer.getChannelData(0);
      const channelR = audioBuffer.getChannelData(1);

      let offset = 0;
      for (const chunk of chunks) {
        for (let i = 0; i < chunk.length / 2; i++) {
          channelL[offset + i] = chunk[i * 2];
          channelR[offset + i] = chunk[i * 2 + 1];
        }
        offset += chunk.length / 2;
      }

      const recordedBpm = bpm; // Record at current BPM

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                audioBuffer,
                isRecording: false,
                recordedBpm,
                name: `Loop ${slotId + 1} (${recordBars > 0 ? recordBars + ' bar' : formatDuration(elapsed)})`,
              }
            : s
        )
      );

      recordingRef.current = null;
    },
    [mixer, bpm, recordBars, getAudioContext]
  );

  // ---------------------------------------------------------------------------
  // Playback logic
  // ---------------------------------------------------------------------------
  const playSlot = useCallback(
    (slotId: number) => {
      const ctx = getAudioContext();
      const outputNode = mixer.getOutputNode();
      const slot = slots.find((s) => s.id === slotId);

      if (!slot?.audioBuffer || !outputNode) return;

      // Stop if already playing
      if (slot.sourceNode) {
        try {
          slot.sourceNode.stop();
          slot.sourceNode.disconnect();
        } catch {
          // ignore
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = slot.audioBuffer;

      // Tempo-sync: adjust playback rate
      if (slot.recordedBpm > 0) {
        source.playbackRate.value = bpm / slot.recordedBpm;
      }

      source.loop = slot.isLooping;

      const gain = ctx.createGain();
      gain.gain.value = slot.volume;

      source.connect(gain);
      gain.connect(outputNode);

      source.onended = () => {
        if (!slot.isLooping) {
          setSlots((prev) =>
            prev.map((s) =>
              s.id === slotId
                ? { ...s, isPlaying: false, sourceNode: null, gainNode: null }
                : s
            )
          );
        }
      };

      source.start(0);

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, isPlaying: true, sourceNode: source, gainNode: gain }
            : s
        )
      );
    },
    [slots, mixer, bpm, getAudioContext]
  );

  const stopSlot = useCallback(
    (slotId: number) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot?.sourceNode) return;

      try {
        slot.sourceNode.stop();
        slot.sourceNode.disconnect();
      } catch {
        // ignore
      }
      if (slot.gainNode) {
        try {
          slot.gainNode.disconnect();
        } catch {
          // ignore
        }
      }

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? { ...s, isPlaying: false, sourceNode: null, gainNode: null }
            : s
        )
      );
    },
    [slots]
  );

  const deleteSlot = useCallback(
    (slotId: number) => {
      const slot = slots.find((s) => s.id === slotId);
      if (slot?.isPlaying) stopSlot(slotId);

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                audioBuffer: null,
                isPlaying: false,
                isLooping: false,
                isRecording: false,
                volume: 0.8,
                recordedBpm: 0,
                name: `Slot ${s.id + 1}`,
                sourceNode: null,
                gainNode: null,
              }
            : s
        )
      );
    },
    [slots, stopSlot]
  );

  const toggleLoop = useCallback((slotId: number) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const newLooping = !s.isLooping;
        // Update source node loop if playing
        if (s.sourceNode) {
          s.sourceNode.loop = newLooping;
        }
        return { ...s, isLooping: newLooping };
      })
    );
  }, []);

  const changeVolume = useCallback(
    (slotId: number, vol: number) => {
      setSlots((prev) =>
        prev.map((s) => {
          if (s.id !== slotId) return s;
          if (s.gainNode) {
            s.gainNode.gain.value = vol;
          }
          return { ...s, volume: vol };
        })
      );
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all playing slots
      slots.forEach((s) => {
        if (s.sourceNode) {
          try {
            s.sourceNode.stop();
            s.sourceNode.disconnect();
          } catch {
            // ignore
          }
        }
        if (s.gainNode) {
          try {
            s.gainNode.disconnect();
          } catch {
            // ignore
          }
        }
      });
      // Stop any active recording
      if (recordingRef.current) {
        if (recordingRef.current.timeoutId) {
          clearTimeout(recordingRef.current.timeoutId);
        }
        try {
          const masterTap = mixer.getMasterRecordingTapNode();
          if (masterTap) masterTap.disconnect(recordingRef.current.scriptNode);
          recordingRef.current.scriptNode.disconnect();
        } catch {
          // ignore
        }
      }
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const currentBarOption = BAR_OPTIONS.find((b) => b.bars === recordBars);

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-800/60 bg-gray-900/80 backdrop-blur-sm',
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Disc className="w-4 h-4 text-purple-400" />
          <h3
            className={cn(
              'font-semibold text-gray-200',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            Sampler / Looper
          </h3>
        </div>

        {/* Record duration selector */}
        <div className="relative">
          <button
            onClick={() => setShowBarMenu(!showBarMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800/60 text-gray-300 
                       hover:bg-gray-700/60 transition-colors text-xs font-mono"
          >
            <Clock className="w-3 h-3" />
            {currentBarOption?.label ?? 'Manual'}
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {showBarMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 
                           rounded-lg shadow-xl overflow-hidden min-w-[100px]"
              >
                {BAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.bars}
                    onClick={() => {
                      setRecordBars(opt.bars);
                      setShowBarMenu(false);
                    }}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-xs font-mono transition-colors',
                      recordBars === opt.bars
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                    )}
                  >
                    {opt.label}
                    {opt.bars > 0 && (
                      <span className="text-gray-600 ml-1">
                        ({calcBarDuration(bpm, opt.bars).toFixed(2)}s)
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* BPM info */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] text-gray-500 font-mono">
          BPM: {bpm.toFixed(1)}
        </span>
        {recordBars > 0 && (
          <span className="text-[10px] text-gray-600 font-mono">
            | Rec length: {calcBarDuration(bpm, recordBars).toFixed(2)}s ({recordBars} bar
            {recordBars > 1 ? 's' : ''})
          </span>
        )}
      </div>

      {/* Sampler grid */}
      <div
        className={cn(
          'grid gap-2',
          compact
            ? 'grid-cols-4'
            : 'grid-cols-4'
        )}
      >
        <AnimatePresence>
          {slots.map((slot) => (
            <SamplerSlotView
              key={slot.id}
              slot={slot}
              color={SLOT_COLORS[slot.id]}
              bpm={bpm}
              compact={compact}
              onRecord={startRecording}
              onStopRecord={stopRecording}
              onPlay={playSlot}
              onStop={stopSlot}
              onDelete={deleteSlot}
              onToggleLoop={toggleLoop}
              onVolumeChange={changeVolume}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
