import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { DJDeck, CuePoint } from '@/lib/djAudio';
import { apiRequest } from '@/lib/queryClient';
import { Trash2, Circle, Play, Database } from 'lucide-react';

interface CuePointControlProps {
  deck: DJDeck;
  className?: string;
}

export default function CuePointControl({ deck, className = '' }: CuePointControlProps) {
  const [hotCues, setHotCues] = useState<(CuePoint | null)[]>(new Array(8).fill(null));
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [trackId, setTrackId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Default hot cue colors (industry standard colors)
  const hotCueColors = [
    '#ff0000', // Red
    '#00ff00', // Green  
    '#0066ff', // Blue
    '#ffff00', // Yellow
    '#ff6600', // Orange
    '#9900ff', // Purple
    '#00ffff', // Cyan
    '#ff00ff'  // Magenta
  ];
  
  // Load cue points from database when track changes
  const { data: dbCuePoints = [], isLoading } = useQuery({
    queryKey: ['/api/cuepoints', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      const params = new URLSearchParams({ trackId });
      const response = await fetch(`/api/cuepoints?${params}`);
      if (!response.ok) throw new Error('Failed to load cue points');
      return response.json();
    },
    enabled: !!trackId,
  });
  
  // Create cue point mutation
  const createCuePointMutation = useMutation({
    mutationFn: async (data: { trackId: string; name: string; timePosition: number; color: string }) => {
      return await apiRequest('/api/cuepoints', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cuepoints', trackId] });
      toast({ title: 'Cue point saved', description: 'Cue point has been saved to database' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save cue point', variant: 'destructive' });
    },
  });
  
  // Delete cue point mutation
  const deleteCuePointMutation = useMutation({
    mutationFn: async (cuePointId: string) => {
      return await apiRequest(`/api/cuepoints/${cuePointId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cuepoints', trackId] });
      toast({ title: 'Cue point deleted', description: 'Cue point has been removed from database' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete cue point', variant: 'destructive' });
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
    
    // Update hot cues when deck changes
    setHotCues([...deck.hotCues]);
    
    // Set up time update callback to refresh UI
    deck.onTimeUpdate((time) => {
      setCurrentTime(time);
    });
  }, [deck]);
  
  // Sync database cue points with deck
  useEffect(() => {
    if (dbCuePoints.length > 0) {
      const newHotCues = new Array(8).fill(null);
      
      dbCuePoints.forEach((dbCue: any, index: number) => {
        if (index < 8) {
          const cuePoint: CuePoint = {
            time: parseFloat(dbCue.timePosition),
            name: dbCue.name,
            color: dbCue.color,
            id: dbCue.id
          };
          newHotCues[index] = cuePoint;
          deck.hotCues[index] = cuePoint;
        }
      });
      
      setHotCues(newHotCues);
    }
  }, [dbCuePoints, deck]);
  
  const handleHotCuePress = async (slotNumber: number) => {
    const hotCue = hotCues[slotNumber - 1];
    
    if (hotCue) {
      // If cue exists, jump to it
      deck.jumpToHotCue(slotNumber);
    } else {
      // If no cue exists, set one at current time
      deck.setHotCue(slotNumber, currentTime);
      setHotCues([...deck.hotCues]);
      
      // Save to database if track is loaded
      if (trackId) {
        createCuePointMutation.mutate({
          trackId,
          name: `Cue ${slotNumber}`,
          timePosition: currentTime,
          color: hotCueColors[slotNumber - 1]
        });
      }
    }
  };
  
  const handleHotCueClear = async (slotNumber: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the button click
    const hotCue = hotCues[slotNumber - 1];
    
    deck.clearHotCue(slotNumber);
    setHotCues([...deck.hotCues]);
    
    // Delete from database if it exists
    if (hotCue && hotCue.id) {
      deleteCuePointMutation.mutate(hotCue.id);
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };
  
  const getButtonVariant = (slotNumber: number, hotCue: CuePoint | null) => {
    if (!hotCue) return 'outline';
    
    // Highlight if we're near this cue point (within 0.5 seconds)
    const isNear = Math.abs(currentTime - hotCue.time) < 0.5;
    return isNear ? 'default' : 'outline';
  };
  
  const getButtonStyle = (slotNumber: number, hotCue: CuePoint | null) => {
    if (!hotCue) {
      return {
        borderColor: hotCueColors[slotNumber - 1],
        color: hotCueColors[slotNumber - 1],
      };
    }
    
    // If we're near this cue point, make it more prominent
    const isNear = Math.abs(currentTime - hotCue.time) < 0.5;
    
    return {
      backgroundColor: isNear ? hotCue.color : 'transparent',
      borderColor: hotCue.color,
      color: isNear ? '#000000' : hotCue.color,
      boxShadow: isNear ? `0 0 10px ${hotCue.color}` : 'none',
    };
  };
  
  return (
    <Card className={`glass-panel neon-border ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center">
          <Circle className="w-5 h-5 mr-2 text-red-400" />
          Hot Cues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hot Cue Grid (2x4) */}
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((slotNumber) => {
            const hotCue = hotCues[slotNumber - 1];
            return (
              <div key={slotNumber} className="relative">
                <Button
                  variant={getButtonVariant(slotNumber, hotCue)}
                  size="lg"
                  className="w-full h-16 flex flex-col items-center justify-center relative transition-all duration-150 hover:scale-105"
                  style={getButtonStyle(slotNumber, hotCue)}
                  onClick={() => handleHotCuePress(slotNumber)}
                  data-testid={`button-hot-cue-${slotNumber}-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  {/* Cue Number */}
                  <span className="text-sm font-bold">{slotNumber}</span>
                  
                  {/* Cue Time or Empty State */}
                  {hotCue ? (
                    <span className="text-xs opacity-75">
                      {formatTime(hotCue.time)}
                    </span>
                  ) : (
                    <span className="text-xs opacity-50">Empty</span>
                  )}
                  
                  {/* Clear Button */}
                  {hotCue && (
                    <button
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white text-xs"
                      onClick={(e) => handleHotCueClear(slotNumber, e)}
                      data-testid={`button-clear-hot-cue-${slotNumber}-${deck.id.toLowerCase().replace(' ', '-')}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        
        {/* Cue Information Panel */}
        <div className="bg-black/30 rounded-lg p-3 space-y-2">
          <div className="text-sm text-white/40 text-center">
            Cue Instructions
          </div>
          <div className="text-xs text-white/30 space-y-1">
            <div>• Click empty slot to set cue at current time</div>
            <div>• Click set cue to jump to that position</div>
            <div>• Click X to clear a cue point</div>
            <div>• Cues auto-save to database</div>
            <div className="flex items-center space-x-1">
              <Database className="w-3 h-3" />
              <span>{isLoading ? 'Loading...' : `${dbCuePoints.length} saved cues`}</span>
            </div>
          </div>
        </div>
        
        {/* Active Cues Summary */}
        <div className="space-y-2">
          <div className="text-sm text-white/40">Active Cues ({hotCues.filter(cue => cue !== null).length}/8)</div>
          <div className="flex flex-wrap gap-1">
            {hotCues.map((hotCue, index) => {
              if (!hotCue) return null;
              
              const isActive = Math.abs(currentTime - hotCue.time) < 0.5;
              
              return (
                <Badge
                  key={index}
                  variant={isActive ? "default" : "outline"}
                  className="text-xs"
                  style={{
                    backgroundColor: isActive ? hotCue.color : 'transparent',
                    borderColor: hotCue.color,
                    color: isActive ? '#000000' : hotCue.color,
                  }}
                  data-testid={`badge-active-cue-${index + 1}-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  {index + 1}: {formatTime(hotCue.time)}
                </Badge>
              );
            })}
          </div>
        </div>
        
        {/* Utility Controls */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/10 text-white/60 hover:bg-black/30"
            onClick={async () => {
              // Clear all cues
              for (let i = 1; i <= 8; i++) {
                const hotCue = hotCues[i - 1];
                deck.clearHotCue(i);
                
                // Delete from database if it exists
                if (hotCue && hotCue.id) {
                  deleteCuePointMutation.mutate(hotCue.id);
                }
              }
              setHotCues(new Array(8).fill(null));
            }}
            data-testid={`button-clear-all-cues-${deck.id.toLowerCase().replace(' ', '-')}`}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-white/10 text-white/60 hover:bg-black/30"
            onClick={() => {
              // Set cues at regular intervals (demo/auto-cue feature)
              const trackDuration = deck.duration;
              if (trackDuration > 0) {
                const interval = trackDuration / 8;
                for (let i = 1; i <= 8; i++) {
                  const time = interval * (i - 1);
                  deck.setHotCue(i, time);
                }
                setHotCues([...deck.hotCues]);
              }
            }}
            data-testid={`button-auto-cues-${deck.id.toLowerCase().replace(' ', '-')}`}
          >
            <Play className="w-4 h-4 mr-1" />
            Auto Set
          </Button>
        </div>
        
        {/* Quick Access to Nearest Cue */}
        {(() => {
          // Find the nearest cue point
          const activeCues = hotCues.filter(cue => cue !== null) as CuePoint[];
          if (activeCues.length === 0) return null;
          
          let nearestCue = activeCues[0];
          let minDistance = Math.abs(currentTime - nearestCue.time);
          
          activeCues.forEach(cue => {
            const distance = Math.abs(currentTime - cue.time);
            if (distance < minDistance) {
              minDistance = distance;
              nearestCue = cue;
            }
          });
          
          // Only show if we're not too close (avoid clutter)
          if (minDistance > 1) {
            return (
              <div className="text-center">
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => deck.seek(nearestCue.time)}
                  data-testid={`button-nearest-cue-${deck.id.toLowerCase().replace(' ', '-')}`}
                >
                  Jump to Nearest Cue
                  <br />
                  <span className="text-xs opacity-75">
                    {formatTime(nearestCue.time)}
                  </span>
                </Button>
              </div>
            );
          }
          
          return null;
        })()}
      </CardContent>
    </Card>
  );
}