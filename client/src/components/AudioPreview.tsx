import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPreviewProps {
  audioUrl: string;
  title?: string;
  color?: string;
  onPlay?: () => void;
  onStop?: () => void;
  compact?: boolean;
}

export default function AudioPreview({
  audioUrl,
  title,
  color = '#3b82f6',
  onPlay,
  onStop,
  compact = false
}: AudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(!compact);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Create audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // Set volume
    audio.volume = volume;
    
    // Get duration when loaded
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };
    
    // Handle end of playback
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onStop) onStop();
      clearInterval(intervalRef.current!);
    };
    
    return () => {
      // Cleanup
      audio.pause();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [audioUrl, onStop]);
  
  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (onStop) onStop();
    } else {
      audioRef.current.currentTime = currentTime;
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
      
      // Update current time every 50ms for smooth updates
      intervalRef.current = window.setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 50) as unknown as number;
      
      if (onPlay) onPlay();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleTimeChange = ([value]: number[]) => {
    setCurrentTime(value);
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  };
  
  const handleVolumeChange = ([value]: number[]) => {
    setVolume(value);
  };
  
  // Format time as mm:ss
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`w-full rounded-lg p-3 bg-white shadow-sm border border-gray-100 ${compact ? 'space-y-1' : 'space-y-3'}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(compact ? false : true)}
    >
      {title && <h4 className="text-sm font-medium text-gray-700">{title}</h4>}
      
      {/* Waveform (lightweight inline visual — self-contained, no deck needed) */}
      <div className="cursor-pointer" onClick={togglePlayback} title="Click to toggle playback">
        <div
          className="flex items-end gap-[2px]"
          style={{ height: compact ? 32 : 48 }}
        >
          {Array.from({ length: 48 }).map((_, i) => {
            const progress = duration > 0 ? currentTime / duration : 0;
            const filled = progress > i / 48;
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${15 + Math.abs(Math.sin(i * 0.7)) * 85}%`,
                  backgroundColor: filled ? color : `${color}33`,
                }}
              />
            );
          })}
        </div>
      </div>
      
      {/* Controls */}
      <div className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 rounded-full" 
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 1}
              step={0.01}
              onValueChange={handleTimeChange}
            />
          </div>
          
          <span className="text-xs text-gray-500 w-16 text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        {!compact && (
          <div className="flex items-center gap-2 mt-2">
            <Volume2 className="h-4 w-4 text-gray-500" />
            <div className="flex-1">
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}