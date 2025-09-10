import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DJDeck } from '@/lib/djAudio';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  SkipBack,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Disc3,
  Zap,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface TransportControlsProps {
  deck: DJDeck;
  className?: string;
}

export default function TransportControls({ deck, className = '' }: TransportControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isNearEnd, setIsNearEnd] = useState(false);
  const [jogTouched, setJogTouched] = useState(false);
  const [jogPosition, setJogPosition] = useState(0);
  
  const jogWheelRef = useRef<HTMLDivElement>(null);
  const lastMouseAngleRef = useRef<number>(0);
  const jogSensitivity = 0.001; // How sensitive the jog wheel is
  
  useEffect(() => {
    // Set up event handlers
    deck.onPlayStateChange((playing) => {
      setIsPlaying(playing);
    });
    
    deck.onTimeUpdate((time) => {
      setCurrentTime(time);
      
      // Check if near track end (30 seconds)
      const nearEnd = deck.isNearTrackEnd(30);
      setIsNearEnd(nearEnd);
    });
    
    // Update duration when track loads
    if (deck.trackInfo) {
      setDuration(deck.duration);
    }
  }, [deck]);
  
  const handlePlayPause = () => {
    if (isPlaying) {
      deck.pause();
    } else {
      deck.play();
    }
  };
  
  const handleStop = () => {
    deck.stop();
  };
  
  const handleNudge = (direction: 'forward' | 'backward') => {
    deck.nudge(direction, 0.02); // 20ms nudge
  };
  
  const handleBeatJump = (beats: number, direction: 'forward' | 'backward') => {
    deck.beatJump(beats, direction);
  };
  
  // Jog wheel mouse handling
  const handleJogMouseDown = (event: React.MouseEvent) => {
    if (!jogWheelRef.current) return;
    
    setJogTouched(true);
    const rect = jogWheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    lastMouseAngleRef.current = angle;
    
    event.preventDefault();
  };
  
  const handleJogMouseMove = (event: React.MouseEvent) => {
    if (!jogTouched || !jogWheelRef.current) return;
    
    const rect = jogWheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    const angleDiff = angle - lastMouseAngleRef.current;
    
    // Handle angle wraparound
    let normalizedDiff = angleDiff;
    if (normalizedDiff > Math.PI) {
      normalizedDiff -= 2 * Math.PI;
    } else if (normalizedDiff < -Math.PI) {
      normalizedDiff += 2 * Math.PI;
    }
    
    // Apply jog wheel effect
    const jogAmount = normalizedDiff * jogSensitivity;
    const direction = jogAmount > 0 ? 'forward' : 'backward';
    deck.nudge(direction, Math.abs(jogAmount));
    
    // Update visual position
    setJogPosition(prev => prev + normalizedDiff * 10);
    
    lastMouseAngleRef.current = angle;
  };
  
  const handleJogMouseUp = () => {
    setJogTouched(false);
  };
  
  // Global mouse events for jog wheel
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (jogTouched && jogWheelRef.current) {
        const rect = jogWheelRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        const angleDiff = angle - lastMouseAngleRef.current;
        
        let normalizedDiff = angleDiff;
        if (normalizedDiff > Math.PI) {
          normalizedDiff -= 2 * Math.PI;
        } else if (normalizedDiff < -Math.PI) {
          normalizedDiff += 2 * Math.PI;
        }
        
        const jogAmount = normalizedDiff * jogSensitivity;
        const direction = jogAmount > 0 ? 'forward' : 'backward';
        deck.nudge(direction, Math.abs(jogAmount));
        
        setJogPosition(prev => prev + normalizedDiff * 10);
        lastMouseAngleRef.current = angle;
      }
    };
    
    const handleGlobalMouseUp = () => {
      setJogTouched(false);
    };
    
    if (jogTouched) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [jogTouched, deck]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getTimeRemaining = (): string => {
    const remaining = duration - currentTime;
    return `-${formatTime(remaining)}`;
  };
  
  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center">
          <Disc3 className="w-5 h-5 mr-2 text-blue-500" />
          Transport
          {isNearEnd && (
            <Badge variant="destructive" className="ml-2 animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Ending Soon
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Jog Wheel */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              ref={jogWheelRef}
              className={`w-32 h-32 rounded-full border-4 ${
                jogTouched 
                  ? 'border-blue-500 bg-blue-900' 
                  : 'border-gray-600 bg-gray-800'
              } cursor-pointer select-none flex items-center justify-center relative transition-colors`}
              onMouseDown={handleJogMouseDown}
              onMouseMove={handleJogMouseMove}
              onMouseUp={handleJogMouseUp}
              style={{
                transform: `rotate(${jogPosition}deg)`,
                transition: jogTouched ? 'none' : 'transform 0.3s ease-out'
              }}
              data-testid={`jog-wheel-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              {/* Jog wheel markings */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-4 bg-gray-400"
                  style={{
                    transform: `rotate(${i * 45}deg) translateY(-50px)`,
                    transformOrigin: 'center 50px'
                  }}
                />
              ))}
              
              {/* Center dot */}
              <div className="w-4 h-4 bg-white rounded-full" />
              
              {/* Touch indicator */}
              {jogTouched && (
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping" />
              )}
            </div>
            
            {/* Jog wheel label */}
            <div className="text-center text-xs text-gray-400 mt-2">
              {jogTouched ? 'Touching' : 'Jog Wheel'}
            </div>
          </div>
        </div>
        
        {/* Main Transport Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant="outline"
            size="lg"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
            onClick={handleStop}
            data-testid={`button-stop-${deck.id.toLowerCase().replace(' ', '-')}`}
          >
            <Square className="w-6 h-6" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className={`${
              isPlaying 
                ? 'bg-red-600 hover:bg-red-700 border-red-500 text-white' 
                : 'bg-green-600 hover:bg-green-700 border-green-500 text-white'
            }`}
            onClick={handlePlayPause}
            data-testid={`button-play-pause-${deck.id.toLowerCase().replace(' ', '-')}`}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
        </div>
        
        {/* Nudge Controls */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400 text-center">Nudge</div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-yellow-600 text-yellow-400 hover:bg-yellow-900"
              onMouseDown={() => handleNudge('backward')}
              data-testid={`button-nudge-back-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              <ChevronLeft className="w-4 h-4" />
              Nudge -
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-yellow-600 text-yellow-400 hover:bg-yellow-900"
              onMouseDown={() => handleNudge('forward')}
              data-testid={`button-nudge-forward-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              <ChevronRight className="w-4 h-4" />
              Nudge +
            </Button>
          </div>
        </div>
        
        {/* Beat Jump Controls */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400 text-center">Beat Jump</div>
          <div className="grid grid-cols-2 gap-2">
            {/* Backward jumps */}
            <div className="space-y-1">
              {[1, 4, 8, 16].map((beats) => (
                <Button
                  key={`back-${beats}`}
                  variant="outline"
                  size="sm"
                  className="w-full border-purple-600 text-purple-400 hover:bg-purple-900"
                  onClick={() => handleBeatJump(beats, 'backward')}
                  data-testid={`button-beat-jump-back-${beats}-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  -{beats}
                </Button>
              ))}
            </div>
            
            {/* Forward jumps */}
            <div className="space-y-1">
              {[1, 4, 8, 16].map((beats) => (
                <Button
                  key={`forward-${beats}`}
                  variant="outline"
                  size="sm"
                  className="w-full border-purple-600 text-purple-400 hover:bg-purple-900"
                  onClick={() => handleBeatJump(beats, 'forward')}
                  data-testid={`button-beat-jump-forward-${beats}-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  <ArrowRight className="w-3 h-3 mr-1" />
                  +{beats}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Time Display */}
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <div className="text-xs text-gray-400">Current Time</div>
              <div 
                className={`text-lg font-mono ${isNearEnd ? 'text-red-400' : 'text-white'}`}
                data-testid={`text-current-time-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                {formatTime(currentTime)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs text-gray-400">Remaining</div>
              <div 
                className={`text-lg font-mono ${isNearEnd ? 'text-red-400 animate-pulse' : 'text-white'}`}
                data-testid={`text-remaining-time-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                {getTimeRemaining()}
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-200 ${
                isNearEnd ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Track End Warning */}
        {isNearEnd && (
          <div className="bg-red-900 border border-red-600 rounded-lg p-3 text-center animate-pulse">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <div className="text-red-200 font-semibold">Track Ending Soon!</div>
            <div className="text-red-300 text-sm">
              {Math.ceil(duration - currentTime)} seconds remaining
            </div>
          </div>
        )}
        
        {/* Instant Actions */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400 text-center">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-600 text-cyan-400 hover:bg-cyan-900"
              onClick={() => deck.seek(0)}
              data-testid={`button-rewind-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Rewind
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-600 text-cyan-400 hover:bg-cyan-900"
              onClick={() => {
                // Jump to 75% of track (outro section)
                deck.seek(duration * 0.75);
              }}
              data-testid={`button-outro-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Outro
            </Button>
          </div>
        </div>
        
        {/* Performance Stats */}
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="text-xs text-gray-400 text-center mb-1">Performance</div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div>
              <div className="text-gray-400">Nudges</div>
              <div className="text-white font-mono">0</div>
            </div>
            <div>
              <div className="text-gray-400">Jumps</div>
              <div className="text-white font-mono">0</div>
            </div>
            <div>
              <div className="text-gray-400">Cues Hit</div>
              <div className="text-white font-mono">0</div>
            </div>
          </div>
        </div>
        
      </CardContent>
    </Card>
  );
}