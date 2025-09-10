import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { DJDeck, LoopPoint } from '@/lib/djAudio';
import { apiRequest } from '@/lib/queryClient';
import { 
  RefreshCw, 
  Square, 
  ArrowLeft, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  RotateCcw,
  Zap,
  Clock,
  Settings,
  Database
} from 'lucide-react';

interface LoopControlProps {
  deck: DJDeck;
  className?: string;
}

export default function LoopControl({ deck, className = '' }: LoopControlProps) {
  const [activeLoop, setActiveLoop] = useState<LoopPoint | null>(null);
  const [currentAutoLoop, setCurrentAutoLoop] = useState<number | null>(null);
  const [isLoopRollActive, setIsLoopRollActive] = useState(false);
  const [manualLoopIn, setManualLoopIn] = useState<number | null>(null);
  const [manualLoopOut, setManualLoopOut] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [trackId, setTrackId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Auto loop sizes in beats
  const autoLoopSizes = [0.25, 0.5, 1, 2, 4, 8, 16, 32];
  
  // Load loops from database when track changes
  const { data: dbLoops = [], isLoading } = useQuery({
    queryKey: ['/api/loops', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      const params = new URLSearchParams({ trackId });
      const response = await fetch(`/api/loops?${params}`);
      if (!response.ok) throw new Error('Failed to load loops');
      return response.json();
    },
    enabled: !!trackId,
  });
  
  // Create loop mutation
  const createLoopMutation = useMutation({
    mutationFn: async (data: { trackId: string; name: string; startTime: number; endTime: number; isActive: boolean }) => {
      return await apiRequest('/api/loops', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loops', trackId] });
      toast({ title: 'Loop saved', description: 'Loop has been saved to database' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save loop', variant: 'destructive' });
    },
  });
  
  // Delete loop mutation
  const deleteLoopMutation = useMutation({
    mutationFn: async (loopId: string) => {
      return await apiRequest(`/api/loops/${loopId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/loops', trackId] });
      toast({ title: 'Loop deleted', description: 'Loop has been removed from database' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete loop', variant: 'destructive' });
    },
  });
  
  useEffect(() => {
    // Update track ID when deck changes - use proper UUID from database
    if (deck.trackInfo) {
      // Use deck's track ID if available, otherwise generate one
      let id = deck.trackId;
      if (!id) {
        id = deck.generateTrackId();
      }
      setTrackId(id);
    } else {
      setTrackId(null);
    }
    
    // Update current time
    deck.onTimeUpdate((time) => {
      setCurrentTime(time);
    });
    
    // Set up event-driven loop state updates
    const updateLoopState = () => {
      const loops = deck.loops;
      const active = loops.find(loop => loop.isActive);
      setActiveLoop(active || null);
      setCurrentAutoLoop(deck.currentAutoLoop);
      setIsLoopRollActive(deck.loopRollActive);
    };
    
    // Initialize state from deck
    updateLoopState();
    
    // Set up event callbacks for real-time updates
    deck.onLoopChange((loops) => {
      const active = loops.find(loop => loop.isActive);
      setActiveLoop(active || null);
    });
    
    deck.onAutoLoopChange((autoLoop) => {
      setCurrentAutoLoop(autoLoop);
    });
    
    deck.onLoopRollChange((isActive) => {
      setIsLoopRollActive(isActive);
    });
  }, [deck]);
  
  // Sync database loops with deck
  useEffect(() => {
    if (dbLoops.length > 0) {
      dbLoops.forEach((dbLoop: any) => {
        const loopPoint: LoopPoint = {
          startTime: parseFloat(dbLoop.startTime),
          endTime: parseFloat(dbLoop.endTime),
          name: dbLoop.name,
          isActive: dbLoop.isActive,
          id: dbLoop.id
        };
        
        // Add to deck if not already present
        const existingLoop = deck.loops.find(l => l.id === dbLoop.id);
        if (!existingLoop) {
          deck.loops.push(loopPoint);
        }
      });
    }
  }, [dbLoops, deck]);
  
  const handleAutoLoop = (beats: number) => {
    if (currentAutoLoop === beats) {
      // If same loop is active, exit it
      deck.clearAutoLoop();
      setCurrentAutoLoop(null);
      setActiveLoop(null);
    } else {
      // Set new auto loop
      deck.setAutoLoop(beats);
      setCurrentAutoLoop(beats);
      // Update active loop from deck
      const active = deck.loops.find(loop => loop.isActive);
      setActiveLoop(active || null);
    }
  };
  
  const handleLoopRoll = (beats: number) => {
    if (isLoopRollActive) {
      deck.stopLoopRoll();
      setIsLoopRollActive(false);
    } else {
      deck.startLoopRoll(beats);
      setIsLoopRollActive(true);
    }
  };
  
  const handleLoopIn = () => {
    setManualLoopIn(currentTime);
  };
  
  const handleLoopOut = async () => {
    if (manualLoopIn !== null) {
      setManualLoopOut(currentTime);
      
      // Create manual loop
      const loop = deck.addLoop(
        'Manual Loop',
        manualLoopIn,
        currentTime
      );
      loop.isActive = true;
      setActiveLoop(loop);
      
      // Save to database if track is loaded
      if (trackId) {
        createLoopMutation.mutate({
          trackId,
          name: 'Manual Loop',
          startTime: manualLoopIn,
          endTime: currentTime,
          isActive: true
        });
      }
    }
  };
  
  const handleLoopExit = () => {
    if (activeLoop) {
      activeLoop.isActive = false;
      deck.clearAutoLoop();
      setActiveLoop(null);
      setCurrentAutoLoop(null);
    }
  };
  
  const handleLoopAdjust = (direction: 'halve' | 'double') => {
    deck.adjustLoopLength(direction);
    
    // Update state after adjustment
    setTimeout(() => {
      const active = deck.loops.find(loop => loop.isActive);
      setActiveLoop(active || null);
      setCurrentAutoLoop(deck.currentAutoLoop);
    }, 50);
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };
  
  const getLoopProgress = (): number => {
    if (!activeLoop) return 0;
    
    const loopLength = activeLoop.endTime - activeLoop.startTime;
    const positionInLoop = currentTime - activeLoop.startTime;
    return (positionInLoop / loopLength) * 100;
  };
  
  const isInLoop = (): boolean => {
    if (!activeLoop) return false;
    return currentTime >= activeLoop.startTime && currentTime <= activeLoop.endTime;
  };
  
  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center">
          <RefreshCw className="w-5 h-5 mr-2 text-green-500" />
          Loop Control
          {activeLoop && (
            <Badge className="ml-2 bg-green-600 text-white">
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Auto Loop Buttons */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400 text-center">Auto Loops (Beats)</div>
          <div className="grid grid-cols-4 gap-2">
            {autoLoopSizes.map((beats) => (
              <Button
                key={beats}
                variant={currentAutoLoop === beats ? 'default' : 'outline'}
                size="sm"
                className={`${
                  currentAutoLoop === beats 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'border-green-600 text-green-400 hover:bg-green-900'
                }`}
                onClick={() => handleAutoLoop(beats)}
                data-testid={`button-auto-loop-${beats}-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                {beats < 1 ? `1/${1/beats}` : beats.toString()}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Loop Roll Buttons */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400 text-center">Loop Roll</div>
          <div className="grid grid-cols-4 gap-2">
            {[0.25, 0.5, 1, 2].map((beats) => (
              <Button
                key={`roll-${beats}`}
                variant={isLoopRollActive ? 'default' : 'outline'}
                size="sm"
                className={`${
                  isLoopRollActive 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white animate-pulse' 
                    : 'border-yellow-600 text-yellow-400 hover:bg-yellow-900'
                }`}
                onClick={() => handleLoopRoll(beats)}
                data-testid={`button-loop-roll-${beats}-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                <Zap className="w-3 h-3 mr-1" />
                {beats < 1 ? `1/${1/beats}` : beats.toString()}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Manual Loop Controls */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400 text-center">Manual Loop</div>
          <div className="flex space-x-2">
            <Button
              variant={manualLoopIn !== null ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${
                manualLoopIn !== null 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'border-blue-600 text-blue-400 hover:bg-blue-900'
              }`}
              onClick={handleLoopIn}
              data-testid={`button-loop-in-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Loop In
            </Button>
            
            <Button
              variant={manualLoopOut !== null ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 ${
                manualLoopOut !== null 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'border-blue-600 text-blue-400 hover:bg-blue-900'
              }`}
              onClick={handleLoopOut}
              disabled={manualLoopIn === null}
              data-testid={`button-loop-out-${deck.id.toLowerCase().replace(' ', '-')}`}
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              Loop Out
            </Button>
          </div>
          
          {/* Manual loop time display */}
          {(manualLoopIn !== null || manualLoopOut !== null) && (
            <div className="text-xs text-gray-400 text-center space-y-1">
              {manualLoopIn !== null && (
                <div>In: {formatTime(manualLoopIn)}</div>
              )}
              {manualLoopOut !== null && (
                <div>Out: {formatTime(manualLoopOut)}</div>
              )}
            </div>
          )}
        </div>
        
        {/* Active Loop Information */}
        {activeLoop && (
          <div className="bg-gray-800 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white font-semibold">
                {activeLoop.name}
              </div>
              <Badge 
                variant="outline" 
                className={`${
                  isInLoop() 
                    ? 'border-green-500 text-green-400' 
                    : 'border-gray-500 text-gray-400'
                }`}
              >
                {activeLoop.beatLength ? `${activeLoop.beatLength} beats` : 'Manual'}
              </Badge>
            </div>
            
            {/* Loop Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{formatTime(activeLoop.startTime)}</span>
                <span>{formatTime(activeLoop.endTime)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-75"
                  style={{ width: `${getLoopProgress()}%` }}
                />
              </div>
            </div>
            
            {/* Loop Controls */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-orange-600 text-orange-400 hover:bg-orange-900"
                onClick={() => handleLoopAdjust('halve')}
                disabled={!activeLoop.beatLength || activeLoop.beatLength <= 0.25}
                data-testid={`button-loop-halve-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                Halve
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900"
                onClick={handleLoopExit}
                data-testid={`button-loop-exit-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                <Square className="w-4 h-4 mr-1" />
                Exit
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-orange-600 text-orange-400 hover:bg-orange-900"
                onClick={() => handleLoopAdjust('double')}
                disabled={!activeLoop.beatLength || activeLoop.beatLength >= 32}
                data-testid={`button-loop-double-${deck.id.toLowerCase().replace(' ', '-')}`}
              >
                <ChevronUp className="w-4 h-4 mr-1" />
                Double
              </Button>
            </div>
          </div>
        )}
        
        {/* Loop Statistics */}
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-sm text-gray-400 text-center mb-2">Loop Stats</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="text-gray-400">Memory</div>
              <div className="text-white font-mono">{deck.loops.length}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">Active</div>
              <div className="text-white font-mono">
                {deck.loops.filter(loop => loop.isActive).length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 flex items-center justify-center">
                <Database className="w-3 h-3 mr-1" />
                DB
              </div>
              <div className="text-white font-mono">
                {isLoading ? '...' : dbLoops.length}
              </div>
            </div>
          </div>
        </div>
        
        {/* Loop Utilities */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            onClick={() => {
              // Clear manual loop points
              setManualLoopIn(null);
              setManualLoopOut(null);
            }}
            data-testid={`button-clear-loop-points-${deck.id.toLowerCase().replace(' ', '-')}`}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Clear Points
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            onClick={() => {
              // Quick set loop at current position (4 beats)
              handleAutoLoop(4);
            }}
            data-testid={`button-quick-loop-${deck.id.toLowerCase().replace(' ', '-')}`}
          >
            <Clock className="w-4 h-4 mr-1" />
            Quick 4
          </Button>
        </div>
        
        {/* Loop Instructions */}
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="text-xs text-gray-500 space-y-1">
            <div>• Auto loops snap to beat grid</div>
            <div>• Loop roll returns to original position</div>
            <div>• Manual loops for custom sections</div>
            <div>• Halve/Double adjusts active loop length</div>
            <div>• Loops auto-save to database</div>
          </div>
        </div>
        
      </CardContent>
    </Card>
  );
}