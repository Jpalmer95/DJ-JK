import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { DJDeck } from '@/lib/djAudio';
import { initAudioContext } from '@/lib/audio';
import {
  StemSeparator,
  StemPlayer,
  StemType,
  StemTrack,
  SeparatedStems,
  StemSeparationProgress,
  getStemColor,
  getStemTypes,
  getStemWaveformData,
  downloadStem,
} from '@/lib/stemSeparation';
import {
  Mic,
  Music,
  Disc3,
  AudioLines,
  Layers,
  Volume2,
  VolumeX,
  Play,
  Square,
  Download,
  Scissors,
  Headphones,
  Zap,
  Loader2,
} from 'lucide-react';

interface StemSeparatorProps {
  deck: DJDeck;
  label: string;
  className?: string;
}

const stemIcons: Record<StemType, React.ComponentType<{ className?: string }>> = {
  vocals: Mic,
  drums: Disc3,
  bass: Music,
  melody: AudioLines,
  other: Layers,
};

interface StemChannelProps {
  type: StemType;
  stem: StemTrack | undefined;
  waveformData: number[];
  onVolumeChange: (type: StemType, volume: number) => void;
  onMuteToggle: (type: StemType) => void;
  onSoloToggle: (type: StemType) => void;
  onDownload: (type: StemType) => void;
}

function StemChannel({
  type,
  stem,
  waveformData,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onDownload,
}: StemChannelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const color = getStemColor(type);
  const IconComponent = stemIcons[type];
  const volume = stem?.volume ?? 1.0;
  const muted = stem?.muted ?? false;
  const solo = stem?.solo ?? false;

  // Draw mini waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barWidth = w / waveformData.length;
    const maxVal = Math.max(...waveformData, 0.01);

    for (let i = 0; i < waveformData.length; i++) {
      const val = waveformData[i] / maxVal;
      const barH = val * h * 0.9;
      const x = i * barWidth;
      const y = (h - barH) / 2;

      ctx.fillStyle = muted ? 'rgba(255,255,255,0.15)' : color;
      ctx.globalAlpha = muted ? 0.3 : 0.7 + 0.3 * val;
      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barH);
    }
    ctx.globalAlpha = 1;
  }, [waveformData, color, muted]);

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border transition-all',
        muted ? 'border-white/10 opacity-60' : 'border-white/20'
      )}
      style={{
        borderColor: muted ? undefined : color + '40',
        background: muted ? undefined : color + '08',
      }}
    >
      {/* Stem icon and label */}
      <div className="flex flex-col items-center w-10 shrink-0">
        <IconComponent className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] uppercase font-semibold" style={{ color }}>
          {type}
        </span>
      </div>

      {/* Mini waveform */}
      <div className="flex-1 min-w-0 h-8">
        <canvas
          ref={canvasRef}
          width={200}
          height={32}
          className="w-full h-full rounded"
        />
      </div>

      {/* Volume slider */}
      <div className="w-20 shrink-0">
        <Slider
          value={[muted ? 0 : volume * 100]}
          min={0}
          max={100}
          step={1}
          onValueChange={([v]) => onVolumeChange(type, v / 100)}
          className="cursor-pointer"
        />
      </div>

      {/* Mute button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 w-7 p-0 shrink-0 transition-all',
          muted
            ? 'bg-red-600/30 text-red-400 hover:bg-red-600/50'
            : 'text-white/50 hover:text-white'
        )}
        onClick={() => onMuteToggle(type)}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </Button>

      {/* Solo button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 px-2 text-xs font-bold shrink-0 transition-all',
          solo
            ? 'bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/50'
            : 'text-white/50 hover:text-white'
        )}
        onClick={() => onSoloToggle(type)}
        title={solo ? 'Unsolo' : 'Solo'}
      >
        S
      </Button>

      {/* Download button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 shrink-0 text-white/40 hover:text-white"
        onClick={() => onDownload(type)}
        title="Download stem"
        disabled={!stem}
      >
        <Download className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

export default function StemSeparatorComponent({ deck, label, className }: StemSeparatorProps) {
  const [isSeparating, setIsSeparating] = useState(false);
  const [progress, setProgress] = useState<StemSeparationProgress | null>(null);
  const [stemPlayer] = useState(() => new StemPlayer());
  const [stems, setStems] = useState<Map<StemType, StemTrack>>(new Map());
  const [waveforms, setWaveforms] = useState<Record<StemType, number[]>>({
    vocals: [],
    drums: [],
    bass: [],
    melody: [],
    other: [],
  });
  const [masterVolume, setMasterVolume] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const stemTypes = getStemTypes();
  const hasStems = stems.size > 0;
  const hasTrackLoaded = !!deck.trackInfo;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stemPlayer.dispose();
    };
  }, [stemPlayer]);

  // Handle stem separation
  const handleSeparate = useCallback(async () => {
    if (!hasTrackLoaded) return;

    setIsSeparating(true);
    setProgress(null);
    setStems(new Map());
    setWaveforms({ vocals: [], drums: [], bass: [], melody: [], other: [] });

    try {
      // We need to get the audio buffer from the deck
      // Since audioBuffer is private, we re-decode from the track source
      const audioContext = initAudioContext();
      if (!audioContext) throw new Error('Audio context not available');

      // Get the track info which has the URL or file
      const trackInfo = deck.trackInfo;
      if (!trackInfo) throw new Error('No track loaded');

      // Try to decode the audio from the source
      let arrayBuffer: ArrayBuffer;
      if (trackInfo.file) {
        arrayBuffer = await trackInfo.file.arrayBuffer();
      } else if (trackInfo.url) {
        const response = await fetch(trackInfo.url);
        if (!response.ok) throw new Error('Failed to fetch track');
        arrayBuffer = await response.arrayBuffer();
      } else {
        throw new Error('No audio source available');
      }

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Run separation
      const separator = new StemSeparator((p) => setProgress(p));
      const separated = await separator.separateStems(audioBuffer);

      // Load stems into player
      stemPlayer.loadStems(separated);

      // Generate waveforms
      const newWaveforms: Record<StemType, number[]> = {} as any;
      for (const type of stemTypes) {
        newWaveforms[type] = getStemWaveformData(separated[type], 128);
      }

      setWaveforms(newWaveforms);
      setStems(stemPlayer.getStems());
    } catch (error) {
      console.error('Stem separation failed:', error);
    } finally {
      setIsSeparating(false);
      setTimeout(() => setProgress(null), 2000);
    }
  }, [deck, hasTrackLoaded, stemPlayer, stemTypes]);

  // Handle volume change
  const handleVolumeChange = useCallback(
    (type: StemType, volume: number) => {
      stemPlayer.setStemVolume(type, volume);
      setStems(new Map(stemPlayer.getStems()));
    },
    [stemPlayer]
  );

  // Handle mute toggle
  const handleMuteToggle = useCallback(
    (type: StemType) => {
      const stem = stems.get(type);
      if (stem) {
        stemPlayer.muteStem(type, !stem.muted);
        setStems(new Map(stemPlayer.getStems()));
      }
    },
    [stemPlayer, stems]
  );

  // Handle solo toggle
  const handleSoloToggle = useCallback(
    (type: StemType) => {
      const stem = stems.get(type);
      if (stem) {
        stemPlayer.soloStem(type, !stem.solo);
        setStems(new Map(stemPlayer.getStems()));
      }
    },
    [stemPlayer, stems]
  );

  // Handle download
  const handleDownload = useCallback(
    (type: StemType) => {
      const stem = stems.get(type);
      if (!stem) return;

      const blob = downloadStem(type, stem.audioBuffer);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deck.trackInfo?.title || 'track'}-${type}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [stems, deck.trackInfo]
  );

  // Handle play/stop
  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      stemPlayer.stop();
      setIsPlaying(false);
    } else {
      stemPlayer.play();
      setIsPlaying(true);
    }
  }, [isPlaying, stemPlayer]);

  // Handle master volume
  const handleMasterVolumeChange = useCallback(
    (value: number) => {
      setMasterVolume(value);
      stemPlayer.setMasterVolume(value / 100);
    },
    [stemPlayer]
  );

  // Handle apply to deck - mix stems and replace deck audio
  const handleApplyToDeck = useCallback(async () => {
    if (!hasStems) return;
    setIsApplying(true);

    try {
      const audioContext = initAudioContext();
      if (!audioContext) throw new Error('Audio context not available');

      // Build a mixed buffer from current stem settings
      const stemMap: Record<string, { buffer: AudioBuffer; volume: number; muted: boolean; solo: boolean }> = {};
      let anySolo = false;

      for (const [type, stem] of stems) {
        stemMap[type] = {
          buffer: stem.audioBuffer,
          volume: stem.volume,
          muted: stem.muted,
          solo: stem.solo,
        };
        if (stem.solo) anySolo = true;
      }

      // Mix stems
      const types = getStemTypes();
      let maxLen = 0;
      let sampleRate = 0;
      for (const type of types) {
        const s = stemMap[type];
        if (s) {
          maxLen = Math.max(maxLen, s.buffer.length);
          sampleRate = s.buffer.sampleRate || sampleRate;
        }
      }

      if (!maxLen || !sampleRate) throw new Error('No stem data to mix');

      const mixed = audioContext.createBuffer(2, maxLen, sampleRate);
      const leftOut = mixed.getChannelData(0);
      const rightOut = mixed.getChannelData(1);

      for (const type of types) {
        const s = stemMap[type];
        if (!s || s.muted) continue;
        if (anySolo && !s.solo) continue;

        const buf = s.buffer;
        const vol = s.volume;

        for (let ch = 0; ch < Math.min(buf.numberOfChannels, 2); ch++) {
          const input = buf.getChannelData(ch);
          const output = ch === 0 ? leftOut : rightOut;
          for (let i = 0; i < input.length; i++) {
            output[i] += input[i] * vol;
          }
        }
      }

      // Normalize
      let peak = 0;
      for (let i = 0; i < maxLen; i++) {
        peak = Math.max(peak, Math.abs(leftOut[i]), Math.abs(rightOut[i]));
      }
      if (peak > 1.0) {
        const scale = 1.0 / peak;
        for (let i = 0; i < maxLen; i++) {
          leftOut[i] *= scale;
          rightOut[i] *= scale;
        }
      }

      // Load the mixed buffer into the deck
      // We need to create a WAV blob and reload it through the deck
      const blob = downloadStem('other', mixed); // Reuse WAV encoder
      const file = new File([blob], `${deck.trackInfo?.title || 'stem-mix'}.wav`, {
        type: 'audio/wav',
      });

      await deck.loadTrack(file, {
        ...deck.trackInfo!,
        title: `${deck.trackInfo?.title || 'Track'} (Stem Mix)`,
        file,
      });

      console.log('Stem mix applied to deck');
    } catch (error) {
      console.error('Failed to apply stem mix:', error);
    } finally {
      setIsApplying(false);
    }
  }, [hasStems, stems, deck]);

  // Check if any stem is soloed
  const hasSolo = stemPlayer.isAnySolo();

  return (
    <Card className={cn('glass-panel neon-border', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-white/70 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-purple-400" />
            <span>{label} Stems</span>
          </div>
          {hasStems && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-2 text-xs',
                  isPlaying
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                )}
                onClick={handlePlayToggle}
              >
                {isPlaying ? (
                  <Square className="w-3 h-3 mr-1" />
                ) : (
                  <Play className="w-3 h-3 mr-1" />
                )}
                {isPlaying ? 'Stop' : 'Preview'}
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Separate Button / Progress */}
        {!isSeparating && !hasStems && (
          <Button
            className="w-full bg-purple-600/80 hover:bg-purple-600 text-white"
            onClick={handleSeparate}
            disabled={!hasTrackLoaded || isSeparating}
          >
            <Zap className="w-4 h-4 mr-2" />
            {hasTrackLoaded ? 'Separate Stems' : 'Load a track first'}
          </Button>
        )}

        {/* Progress */}
        {isSeparating && progress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="capitalize">{progress.phase}</span>
              {progress.currentStem && (
                <span style={{ color: getStemColor(progress.currentStem) }}>
                  {progress.currentStem}
                </span>
              )}
              <span className="ml-auto">{Math.round(progress.progress)}%</span>
            </div>
            <Progress value={progress.progress} className="h-1.5" />
          </div>
        )}

        {/* Stem channels */}
        {hasStems && (
          <>
            <div className="space-y-1.5">
              {stemTypes.map((type) => (
                <StemChannel
                  key={type}
                  type={type}
                  stem={stems.get(type)}
                  waveformData={waveforms[type]}
                  onVolumeChange={handleVolumeChange}
                  onMuteToggle={handleMuteToggle}
                  onSoloToggle={handleSoloToggle}
                  onDownload={handleDownload}
                />
              ))}
            </div>

            {/* Master volume */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
              <Headphones className="w-4 h-4 text-white/50 shrink-0" />
              <span className="text-xs text-white/50 shrink-0">Master</span>
              <Slider
                value={[masterVolume]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => handleMasterVolumeChange(v)}
                className="flex-1"
              />
              <span className="text-xs text-white/40 w-8 text-right">{masterVolume}%</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-white/10 text-white/60 hover:bg-white/10"
                onClick={handleSeparate}
                disabled={isSeparating}
              >
                <Zap className="w-3 h-3 mr-1" />
                Re-separate
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs bg-green-600/80 hover:bg-green-600 text-white"
                onClick={handleApplyToDeck}
                disabled={!hasStems || isApplying}
              >
                {isApplying ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 mr-1" />
                )}
                Apply to Deck
              </Button>
            </div>

            {/* Solo indicator */}
            {hasSolo && (
              <div className="text-center text-xs text-yellow-400/70">
                Solo active - only soloed stems audible
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
