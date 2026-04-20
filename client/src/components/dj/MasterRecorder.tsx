import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Circle,
  Square,
  Play,
  Pause,
  Download,
  Trash2,
  Disc,
  Volume2,
} from 'lucide-react';
import { DJMixer } from '@/lib/djAudio';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// WAV encoder – 16-bit PCM, mono or stereo
// ---------------------------------------------------------------------------
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  const ab = new ArrayBuffer(bufferSize);
  const view = new DataView(ab);

  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };

  // RIFF header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');

  // fmt  chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write samples
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([ab], { type: 'audio/wav' });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getLevelColor(level: number): string {
  if (level > 0.9) return '#ef4444'; // red
  if (level > 0.7) return '#f59e0b'; // amber
  if (level > 0.5) return '#eab308'; // yellow
  return '#22c55e'; // green
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RecordedClip {
  id: string;
  audioBuffer: AudioBuffer;
  timestamp: Date;
  duration: number;
  blobUrl: string;
}

interface MasterRecorderProps {
  mixer: DJMixer;
}

// ---------------------------------------------------------------------------
// Level Meter Component – two vertical bars (L/R) with peak hold
// ---------------------------------------------------------------------------
interface LevelMeterBarProps {
  level: number;
  peak: number;
  label: string;
}

const LevelMeterBar = ({ level, peak, label }: LevelMeterBarProps) => {
  const barH = Math.max(level * 100, 0);
  const peakH = Math.max(peak * 100, 0);
  const barColor = getLevelColor(level);
  const peakColor = getLevelColor(peak);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-5 h-32 bg-gray-900/80 rounded-sm border border-gray-700/50 overflow-hidden">
        {/* RMS fill */}
        <div
          className="absolute bottom-0 w-full transition-[height] duration-75 ease-out rounded-t-sm"
          style={{
            height: `${barH}%`,
            background: `linear-gradient(to top, ${barColor}cc, ${barColor})`,
          }}
        />
        {/* Peak hold line */}
        {peakH > 0 && (
          <div
            className="absolute left-0 w-full h-[2px] transition-[bottom] duration-75"
            style={{
              bottom: `${peakH}%`,
              backgroundColor: peakColor,
              boxShadow: `0 0 4px ${peakColor}`,
            }}
          />
        )}
        {/* dB markers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-full h-px bg-red-500/40" style={{ bottom: '100%' }} />
          <div className="absolute w-full h-px bg-yellow-500/30" style={{ bottom: '75%' }} />
          <div className="absolute w-full h-px bg-green-500/20" style={{ bottom: '50%' }} />
        </div>
      </div>
      <span className="text-[9px] text-gray-500 font-mono select-none">{label}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const MasterRecorder = ({ mixer }: MasterRecorderProps) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [clips, setClips] = useState<RecordedClip[]>([]);

  // Level meter state
  const [meterLevel, setMeterLevel] = useState({ rms: 0, peak: 0 });
  const [peakHold, setPeakHold] = useState({ l: 0, r: 0 });

  // Refs for recording infrastructure
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const leftDataRef = useRef<Float32Array[]>([]);
  const rightDataRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const peakDecayRef = useRef({ l: 0, r: 0 });

  // Playback state
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // -----------------------------------------------------------------------
  // Level meter animation loop
  // -----------------------------------------------------------------------
  const updateMeters = useCallback(() => {
    if (!isRecording) return;

    const data = mixer.getMasterRecordingLevelData();
    setMeterLevel(data);

    // Simulate L/R with slight spread from the combined value
    const leftLevel = data.rms * (0.85 + Math.random() * 0.3);
    const rightLevel = data.rms * (0.85 + Math.random() * 0.3);

    peakDecayRef.current.l = Math.max(peakDecayRef.current.l * 0.96, leftLevel);
    peakDecayRef.current.r = Math.max(peakDecayRef.current.r * 0.96, rightLevel);

    setPeakHold({
      l: peakDecayRef.current.l,
      r: peakDecayRef.current.r,
    });

    animFrameRef.current = requestAnimationFrame(updateMeters);
  }, [isRecording, mixer]);

  useEffect(() => {
    if (isRecording) {
      animFrameRef.current = requestAnimationFrame(updateMeters);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording, updateMeters]);

  // Also update meters when not recording (idle monitoring)
  useEffect(() => {
    let raf: number;
    const idleUpdate = () => {
      if (!isRecording) {
        const data = mixer.getMasterRecordingLevelData();
        setMeterLevel(data);
      }
      raf = requestAnimationFrame(idleUpdate);
    };
    raf = requestAnimationFrame(idleUpdate);
    return () => cancelAnimationFrame(raf);
  }, [isRecording, mixer]);

  // -----------------------------------------------------------------------
  // Recording
  // -----------------------------------------------------------------------
  const startRecording = useCallback(() => {
    const tapNode = mixer.getMasterRecordingTapNode();
    if (!tapNode) {
      console.error('MasterRecorder: no recording tap node available');
      return;
    }

    const ctx = tapNode.context as AudioContext;
    const sampleRate = ctx.sampleRate;

    // Reset buffers
    leftDataRef.current = [];
    rightDataRef.current = [];

    // Create a ScriptProcessorNode to capture audio
    const bufferSize = 4096;
    const scriptNode = ctx.createScriptProcessor(bufferSize, 2, 2);
    scriptNode.onaudioprocess = (e) => {
      const inputL = e.inputBuffer.getChannelData(0);
      const inputR =
        e.inputBuffer.numberOfChannels > 1
          ? e.inputBuffer.getChannelData(1)
          : e.inputBuffer.getChannelData(0);
      // Copy the data so it isn't overwritten
      leftDataRef.current.push(new Float32Array(inputL));
      rightDataRef.current.push(new Float32Array(inputR));
    };

    // Connect: tap -> scriptNode -> (silent) destination so the node processes
    const silentDest = ctx.createGain();
    silentDest.gain.value = 0;
    scriptNode.connect(silentDest);
    silentDest.connect(ctx.destination);

    // We also need to connect the tap to the scriptNode.
    // But the tap is already connected to the output chain.
    // We use connectRecordingDestination to hook in.
    mixer.connectRecordingDestination(scriptNode);

    scriptNodeRef.current = scriptNode;
    recordingDestRef.current = null; // not using MediaStream approach

    setIsRecording(true);
    setRecordingTime(0);
    peakDecayRef.current = { l: 0, r: 0 };

    // Timer
    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      setRecordingTime((Date.now() - startTime) / 1000);
    }, 100);
  }, [mixer]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const scriptNode = scriptNodeRef.current;
    if (!scriptNode) return;

    // Disconnect
    mixer.disconnectRecordingDestination(scriptNode);
    scriptNode.disconnect();
    scriptNode.onaudioprocess = null;
    scriptNodeRef.current = null;

    // Build AudioBuffer from accumulated data
    const leftChunks = leftDataRef.current;
    const rightChunks = rightDataRef.current;
    const totalSamples = leftChunks.reduce((sum, c) => sum + c.length, 0);

    if (totalSamples === 0) {
      setIsRecording(false);
      return;
    }

    const tapNode = mixer.getMasterRecordingTapNode();
    const ctx = tapNode?.context as AudioContext;
    const sampleRate = ctx?.sampleRate ?? 44100;

    const audioBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const outL = audioBuffer.getChannelData(0);
    const outR = audioBuffer.getChannelData(1);

    let offL = 0;
    let offR = 0;
    for (const chunk of leftChunks) {
      outL.set(chunk, offL);
      offL += chunk.length;
    }
    for (const chunk of rightChunks) {
      outR.set(chunk, offR);
      offR += chunk.length;
    }

    const blob = audioBufferToWav(audioBuffer);
    const blobUrl = URL.createObjectURL(blob);

    const clip: RecordedClip = {
      id: `clip-${Date.now()}`,
      audioBuffer,
      timestamp: new Date(),
      duration: audioBuffer.duration,
      blobUrl,
    };

    setClips((prev) => [clip, ...prev]);
    setIsRecording(false);
    setRecordingTime(0);
  }, [isRecording, mixer]);

  // -----------------------------------------------------------------------
  // Clip actions
  // -----------------------------------------------------------------------
  const playClip = useCallback((clip: RecordedClip) => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }

    if (playingClipId === clip.id) {
      setPlayingClipId(null);
      return;
    }

    const audio = new Audio(clip.blobUrl);
    audioElRef.current = audio;
    setPlayingClipId(clip.id);

    audio.onended = () => {
      setPlayingClipId(null);
      audioElRef.current = null;
    };
    audio.play().catch(console.error);
  }, [playingClipId]);

  const downloadClip = useCallback((clip: RecordedClip) => {
    const wav = audioBufferToWav(clip.audioBuffer);
    const dateStr = formatDate(clip.timestamp);
    downloadBlob(wav, `DJ-JK-recording-${dateStr}.wav`);
  }, []);

  const deleteClip = useCallback((clipId: string) => {
    if (playingClipId === clipId && audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
      setPlayingClipId(null);
    }
    setClips((prev) => {
      const clip = prev.find((c) => c.id === clipId);
      if (clip) URL.revokeObjectURL(clip.blobUrl);
      return prev.filter((c) => c.id !== clipId);
    });
  }, [playingClipId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioElRef.current) audioElRef.current.pause();
      if (scriptNodeRef.current) {
        try { mixer.disconnectRecordingDestination(scriptNodeRef.current); } catch { /* ignore */ }
      }
      clips.forEach((c) => URL.revokeObjectURL(c.blobUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-4 space-y-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-gray-200 tracking-wide">
            Master Recorder
          </span>
          {isRecording && (
            <motion.div
              className="flex items-center gap-1.5 ml-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                style={{ boxShadow: '0 0 8px rgba(239,68,68,0.7)' }}
              />
              <span className="text-xs font-mono text-red-400">REC</span>
            </motion.div>
          )}
        </div>

        {/* Recording timer */}
        <div className="font-mono text-sm text-gray-300 tabular-nums">
          {formatTime(recordingTime)}
        </div>
      </div>

      {/* Main row: meters + controls */}
      <div className="flex items-start gap-4">
        {/* Level Meters */}
        <div className="flex items-end gap-1.5">
          <LevelMeterBar
            level={meterLevel.rms * 0.8}
            peak={peakHold.l}
            label="L"
          />
          <LevelMeterBar
            level={meterLevel.rms * 0.8}
            peak={peakHold.r}
            label="R"
          />
        </div>

        {/* Controls + dB readout */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 pt-2">
          {/* Record / Stop button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              'relative w-14 h-14 rounded-full flex items-center justify-center',
              'transition-all duration-200 border-2',
              isRecording
                ? 'bg-red-600/20 border-red-500 hover:bg-red-600/40 shadow-[0_0_16px_rgba(239,68,68,0.4)]'
                : 'bg-gray-800/60 border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
            )}
          >
            {isRecording ? (
              <Square className="w-5 h-5 text-red-400 fill-red-400" />
            ) : (
              <Circle className="w-5 h-5 text-cyan-400 fill-cyan-400" />
            )}
          </button>

          <span className="text-[10px] text-gray-500 uppercase tracking-widest">
            {isRecording ? 'Stop' : 'Record'}
          </span>

          {/* Numeric dB display */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-gray-500" />
              <span className={cn(
                'tabular-nums',
                meterLevel.peak > 0.9 ? 'text-red-400' :
                meterLevel.peak > 0.7 ? 'text-amber-400' : 'text-green-400'
              )}>
                {meterLevel.peak > 0.001
                  ? `${(20 * Math.log10(meterLevel.peak)).toFixed(1)} dB`
                  : '-inf dB'}
              </span>
            </div>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500 tabular-nums">
              RMS{' '}
              {meterLevel.rms > 0.001
                ? `${(20 * Math.log10(meterLevel.rms)).toFixed(1)}`
                : '-inf'}
            </span>
          </div>
        </div>
      </div>

      {/* Recorded clips list */}
      <AnimatePresence>
        {clips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 pt-1">
              <div className="h-px flex-1 bg-gray-700/50" />
              <span className="text-[10px] uppercase tracking-widest text-gray-500">
                Clips ({clips.length})
              </span>
              <div className="h-px flex-1 bg-gray-700/50" />
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              <AnimatePresence>
                {clips.map((clip) => (
                  <motion.div
                    key={clip.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800/50 border border-gray-700/40 group"
                  >
                    {/* Timestamp */}
                    <span className="text-[10px] font-mono text-gray-500 w-24 shrink-0">
                      {clip.timestamp.toLocaleTimeString()}
                    </span>

                    {/* Duration */}
                    <span className="text-[11px] font-mono text-cyan-400/80 tabular-nums shrink-0">
                      {formatTime(clip.duration)}
                    </span>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Play */}
                    <button
                      onClick={() => playClip(clip)}
                      className={cn(
                        'p-1.5 rounded-md transition-colors',
                        playingClipId === clip.id
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      )}
                      title={playingClipId === clip.id ? 'Stop' : 'Play'}
                    >
                      {playingClipId === clip.id ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Download */}
                    <button
                      onClick={() => downloadClip(clip)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-green-400 hover:bg-gray-700/50 transition-colors"
                      title="Download WAV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteClip(clip.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-700/50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
