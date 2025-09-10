import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { DJMixer, DJDeck, DJTrackInfo } from '@/lib/djAudio';
import { DjTrack } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Play, Pause, Square, Upload, Volume2, RotateCcw, RotateCw, Music, Settings } from 'lucide-react';
import WaveformVisualizer from '@/components/WaveformVisualizer';
import SunoGenerator from '@/components/SunoGenerator';
import type { SunoTrackResult } from '@/lib/sunoApi';

interface DeckControlProps {
  deck: DJDeck;
  deckLabel: string;
  onLoadTrack: (file: File) => void;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  pitchPercentage: number;
  onVolumeChange: (volume: number) => void;
  onPitchChange: (percentage: number) => void;
}

function DeckControl({ 
  deck, 
  deckLabel, 
  onLoadTrack, 
  currentTime, 
  duration, 
  isPlaying, 
  volume, 
  pitchPercentage,
  onVolumeChange,
  onPitchChange
}: DeckControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLoadTrack(file);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      deck.pause();
    } else {
      deck.play();
    }
  };

  const handleSeek = (newTime: number[]) => {
    deck.seek(newTime[0]);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0] / 100;
    deck.setVolume(volumeValue);
    onVolumeChange(volumeValue);
  };

  const handlePitchChange = (newPitch: number[]) => {
    const pitchValue = newPitch[0];
    deck.setPitchPercentage(pitchValue);
    onPitchChange(pitchValue);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-gray-900 border-gray-700 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">{deckLabel}</h3>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
          onClick={() => fileInputRef.current?.click()}
          data-testid={`button-load-track-${deckLabel.toLowerCase().replace(' ', '-')}`}
        >
          <Upload className="w-4 h-4 mr-2" />
          Load Track
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Track Info */}
      <div className="bg-gray-800 p-3 rounded-lg">
        <div className="text-white font-semibold" data-testid={`text-track-title-${deckLabel.toLowerCase().replace(' ', '-')}`}>
          {deck.trackInfo?.title || 'No Track Loaded'}
        </div>
        <div className="text-gray-400 text-sm" data-testid={`text-track-artist-${deckLabel.toLowerCase().replace(' ', '-')}`}>
          {deck.trackInfo?.artist || 'Select an audio file'}
        </div>
        <div className="text-gray-400 text-xs mt-1">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Waveform Display */}
      <div className="h-16 bg-gray-800 rounded-lg flex items-center justify-center">
        {deck.trackInfo?.url ? (
          <WaveformVisualizer 
            audioUrl={deck.trackInfo.url} 
            color="#10b981" 
            height={60}
            playing={isPlaying}
          />
        ) : (
          <div className="text-gray-500 text-sm">Load track to see waveform</div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
          data-testid={`slider-progress-${deckLabel.toLowerCase().replace(' ', '-')}`}
        />
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="outline"
          size="lg"
          className={`${isPlaying ? 'bg-red-600 hover:bg-red-700 border-red-500' : 'bg-green-600 hover:bg-green-700 border-green-500'} text-white`}
          onClick={handlePlayPause}
          data-testid={`button-play-pause-${deckLabel.toLowerCase().replace(' ', '-')}`}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
          onClick={() => deck.stop()}
          data-testid={`button-stop-${deckLabel.toLowerCase().replace(' ', '-')}`}
        >
          <Square className="w-6 h-6" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">{Math.round(volume * 100)}%</span>
        </div>
        <Slider
          value={[volume * 100]}
          max={100}
          step={1}
          onValueChange={handleVolumeChange}
          className="w-full"
          data-testid={`slider-volume-${deckLabel.toLowerCase().replace(' ', '-')}`}
        />
      </div>

      {/* Pitch Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <RotateCcw className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Pitch</span>
            <RotateCw className="w-4 h-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-400">
            {pitchPercentage > 0 ? '+' : ''}{pitchPercentage.toFixed(1)}%
          </span>
        </div>
        <Slider
          value={[pitchPercentage]}
          min={-12}
          max={12}
          step={0.1}
          onValueChange={handlePitchChange}
          className="w-full"
          data-testid={`slider-pitch-${deckLabel.toLowerCase().replace(' ', '-')}`}
        />
      </div>
    </Card>
  );
}

interface MixerControlProps {
  mixer: DJMixer;
  crossfaderPosition: number;
  masterVolume: number;
  onCrossfaderChange: (position: number) => void;
  onMasterVolumeChange: (volume: number) => void;
}

function MixerControl({ mixer, crossfaderPosition, masterVolume, onCrossfaderChange, onMasterVolumeChange }: MixerControlProps) {
  const handleCrossfaderChange = (newPosition: number[]) => {
    const position = newPosition[0] / 100;
    mixer.setCrossfader(position);
    onCrossfaderChange(position);
  };

  const handleMasterVolumeChange = (newVolume: number[]) => {
    const volume = newVolume[0] / 100;
    mixer.setMasterVolume(volume);
    onMasterVolumeChange(volume);
  };

  const handleSyncTempos = () => {
    mixer.syncTempos();
  };

  return (
    <Card className="bg-gray-900 border-gray-700 p-6 space-y-6">
      <h3 className="text-xl font-bold text-white text-center">Mixer</h3>
      
      {/* Crossfader */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Deck A</span>
          <span className="text-sm text-gray-400">Crossfader</span>
          <span className="text-sm text-gray-400">Deck B</span>
        </div>
        <Slider
          value={[crossfaderPosition * 100]}
          max={100}
          step={1}
          onValueChange={handleCrossfaderChange}
          className="w-full"
          data-testid="slider-crossfader"
        />
      </div>

      {/* Master Volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Master</span>
          <span className="text-sm text-gray-400">{Math.round(masterVolume * 100)}%</span>
        </div>
        <Slider
          value={[masterVolume * 100]}
          max={100}
          step={1}
          onValueChange={handleMasterVolumeChange}
          className="w-full"
          data-testid="slider-master-volume"
        />
      </div>

      {/* Sync Button */}
      <Button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        onClick={handleSyncTempos}
        data-testid="button-sync-tempos"
      >
        <Music className="w-4 h-4 mr-2" />
        Sync Tempos
      </Button>
    </Card>
  );
}

interface TrackBrowserProps {
  onLoadTrackToDeck: (track: DjTrack, deckId: string) => void;
}

function TrackBrowser({ onLoadTrackToDeck }: TrackBrowserProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tracks from API
  const { data: tracks = [], isLoading, error } = useQuery({
    queryKey: ['/api/tracks'],
    enabled: false, // We'll enable this when we have proper user auth
  });

  const uploadTrackMutation = useMutation({
    mutationFn: async (formData: { file: File; title: string; artist: string }) => {
      // For now, we'll create a URL from the file and store basic track info
      const trackInfo = {
        userId: 1, // Hardcoded for now
        title: formData.title || formData.file.name,
        artist: formData.artist || 'Unknown Artist',
        url: URL.createObjectURL(formData.file),
        duration: 0, // Will be set when audio loads
        genre: null,
      };
      
      return await apiRequest('/api/tracks', {
        method: 'POST',
        body: JSON.stringify(trackInfo),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
      toast({
        title: "Track uploaded successfully",
        description: "Track has been added to your library",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Failed to upload track to library",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="bg-gray-900 border-gray-700 p-6 space-y-4">
      <h3 className="text-xl font-bold text-white">Track Library</h3>
      
      <div className="text-center p-8 border-2 border-dashed border-gray-600 rounded-lg">
        <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <div className="text-gray-400 mb-4">
          Track library will be available with user authentication
        </div>
        <div className="text-sm text-gray-500">
          For now, use the "Load Track" buttons on each deck to load audio files directly
        </div>
      </div>
    </Card>
  );
}

export default function DJPage() {
  const [mixer] = useState(() => new DJMixer());
  const [deckAState, setDeckAState] = useState({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
    pitchPercentage: 0,
  });
  const [deckBState, setDeckBState] = useState({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
    pitchPercentage: 0,
  });
  const [mixerState, setMixerState] = useState({
    crossfaderPosition: 0.5,
    masterVolume: 1,
  });

  const { toast } = useToast();

  useEffect(() => {
    // Set up event handlers for deck state updates
    mixer.deckA.onTimeUpdate((time) => {
      setDeckAState(prev => ({ ...prev, currentTime: time }));
    });

    mixer.deckA.onPlayStateChange((isPlaying) => {
      setDeckAState(prev => ({ ...prev, isPlaying }));
    });

    mixer.deckB.onTimeUpdate((time) => {
      setDeckBState(prev => ({ ...prev, currentTime: time }));
    });

    mixer.deckB.onPlayStateChange((isPlaying) => {
      setDeckBState(prev => ({ ...prev, isPlaying }));
    });

    return () => {
      // Clear event callbacks to prevent memory leaks (don't destroy the whole mixer)
      mixer.deckA.onTimeUpdate(() => {});
      mixer.deckA.onPlayStateChange(() => {});
      mixer.deckB.onTimeUpdate(() => {});
      mixer.deckB.onPlayStateChange(() => {});
    };
  }, [mixer]);

  const handleLoadTrackToDeckA = async (file: File) => {
    try {
      // Create object URL for waveform visualization
      const audioUrl = URL.createObjectURL(file);
      
      const trackInfo: DJTrackInfo = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist",
        duration: 0,
        file: file,
        url: audioUrl, // Add URL for waveform
      };

      await mixer.deckA.loadTrack(file, trackInfo);
      setDeckAState(prev => ({ 
        ...prev, 
        duration: mixer.deckA.duration,
        currentTime: 0,
        volume: mixer.deckA.volume,
        pitchPercentage: mixer.deckA.getPitchPercentage(),
      }));
      
      toast({
        title: "Track loaded to Deck A",
        description: `${trackInfo.title} is ready to play`,
      });
    } catch (error) {
      toast({
        title: "Failed to load track",
        description: "Could not load the selected audio file",
        variant: "destructive",
      });
    }
  };

  const handleLoadTrackToDeckB = async (file: File) => {
    try {
      // Create object URL for waveform visualization
      const audioUrl = URL.createObjectURL(file);
      
      const trackInfo: DJTrackInfo = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist", 
        duration: 0,
        file: file,
        url: audioUrl, // Add URL for waveform
      };

      await mixer.deckB.loadTrack(file, trackInfo);
      setDeckBState(prev => ({ 
        ...prev, 
        duration: mixer.deckB.duration,
        currentTime: 0,
        volume: mixer.deckB.volume,
        pitchPercentage: mixer.deckB.getPitchPercentage(),
      }));
      
      toast({
        title: "Track loaded to Deck B",
        description: `${trackInfo.title} is ready to play`,
      });
    } catch (error) {
      toast({
        title: "Failed to load track",
        description: "Could not load the selected audio file",
        variant: "destructive",
      });
    }
  };

  const handleLoadTrackFromLibrary = async (track: DjTrack, deckId: string) => {
    // This will be implemented when we have proper track storage
    toast({
      title: "Feature coming soon",
      description: "Loading tracks from library will be available with user authentication",
    });
  };

  // Load AI-generated track from Suno
  const handleLoadSunoTrack = async (track: SunoTrackResult, deckId: string) => {
    try {
      const deck = deckId === 'Deck A' ? mixer.deckA : mixer.deckB;
      const setDeckState = deckId === 'Deck A' ? setDeckAState : setDeckBState;

      const trackInfo: DJTrackInfo = {
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        url: track.audioUrl,
        bpm: track.bpm,
        key: track.key,
      };

      // Load track from URL (since it's AI-generated and hosted externally)
      await deck.loadTrack(track.audioUrl, trackInfo);
      
      setDeckState(prev => ({ 
        ...prev, 
        duration: deck.duration,
        currentTime: 0,
        volume: deck.volume,
        pitchPercentage: deck.getPitchPercentage(),
      }));
      
      toast({
        title: `AI Track loaded to ${deckId}`,
        description: `"${track.title}" by ${track.artist} is ready to play`,
      });
    } catch (error) {
      console.error('Error loading Suno track:', error);
      toast({
        title: "Failed to load AI track",
        description: "Could not load the generated track",
        variant: "destructive",
      });
    }
  };

  // Callback handlers for immediate state updates
  const handleDeckAVolumeChange = (volume: number) => {
    setDeckAState(prev => ({ ...prev, volume }));
  };

  const handleDeckAPitchChange = (pitchPercentage: number) => {
    setDeckAState(prev => ({ ...prev, pitchPercentage }));
  };

  const handleDeckBVolumeChange = (volume: number) => {
    setDeckBState(prev => ({ ...prev, volume }));
  };

  const handleDeckBPitchChange = (pitchPercentage: number) => {
    setDeckBState(prev => ({ ...prev, pitchPercentage }));
  };

  const handleCrossfaderChange = (crossfaderPosition: number) => {
    setMixerState(prev => ({ ...prev, crossfaderPosition }));
  };

  const handleMasterVolumeChange = (masterVolume: number) => {
    setMixerState(prev => ({ ...prev, masterVolume }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold" data-testid="text-dj-booth-title">
            DJ Booth
          </h1>
          <div className="flex items-center space-x-4">
            <SunoGenerator onLoadToDeck={handleLoadSunoTrack} />
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Main DJ Interface */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deck A */}
          <div>
            <DeckControl
              deck={mixer.deckA}
              deckLabel="Deck A"
              onLoadTrack={handleLoadTrackToDeckA}
              currentTime={deckAState.currentTime}
              duration={deckAState.duration}
              isPlaying={deckAState.isPlaying}
              volume={deckAState.volume}
              pitchPercentage={deckAState.pitchPercentage}
              onVolumeChange={handleDeckAVolumeChange}
              onPitchChange={handleDeckAPitchChange}
            />
          </div>

          {/* Mixer */}
          <div>
            <MixerControl
              mixer={mixer}
              crossfaderPosition={mixerState.crossfaderPosition}
              masterVolume={mixerState.masterVolume}
              onCrossfaderChange={handleCrossfaderChange}
              onMasterVolumeChange={handleMasterVolumeChange}
            />
            
            {/* Track Browser */}
            <div className="mt-6">
              <TrackBrowser onLoadTrackToDeck={handleLoadTrackFromLibrary} />
            </div>
          </div>

          {/* Deck B */}
          <div>
            <DeckControl
              deck={mixer.deckB}
              deckLabel="Deck B"
              onLoadTrack={handleLoadTrackToDeckB}
              currentTime={deckBState.currentTime}
              duration={deckBState.duration}
              isPlaying={deckBState.isPlaying}
              volume={deckBState.volume}
              pitchPercentage={deckBState.pitchPercentage}
              onVolumeChange={handleDeckBVolumeChange}
              onPitchChange={handleDeckBPitchChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}