import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { DJMixer, DJDeck, DJTrackInfo } from '@/lib/djAudio';
import { DjTrack } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Upload, Volume2, Music, Settings, Headphones, Radio } from 'lucide-react';
import WaveformVisualizer from '@/components/WaveformVisualizer';
import BPMDisplay from '@/components/dj/BPMDisplay';
import CuePointControl from '@/components/dj/CuePointControl';
import LoopControl from '@/components/dj/LoopControl';
import TransportControls from '@/components/dj/TransportControls';
import EqualizerPanel from '@/components/dj/EqualizerPanel';
import EffectsRack from '@/components/dj/EffectsRack';
import EffectPresets from '@/components/dj/EffectPresets';
import SpectrumAnalyzer from '@/components/dj/SpectrumAnalyzer';
import BeatReactiveVisuals from '@/components/dj/BeatReactiveVisuals';
import VisualizationControls from '@/components/dj/VisualizationControls';
import FullScreenVisualizer from '@/components/dj/FullScreenVisualizer';
import SunoGenerator from '@/components/SunoGenerator';
import MoodMenu from '@/components/MoodMenu';
import MoodJourneyTracker from '@/components/MoodJourneyTracker';
import type { SunoTrackResult } from '@/lib/sunoApi';

interface ProfessionalDeckProps {
  deck: DJDeck;
  otherDeck?: DJDeck;
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

function ProfessionalDeck({ 
  deck, 
  otherDeck,
  deckLabel, 
  onLoadTrack, 
  currentTime, 
  duration, 
  isPlaying, 
  volume, 
  pitchPercentage,
  onVolumeChange,
  onPitchChange
}: ProfessionalDeckProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLoadTrack(file);
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
    <div className="space-y-4">
      {/* Deck Header */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="text-white text-xl">{deckLabel}</span>
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
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Professional Waveform Display */}
          <div className="h-20 bg-gray-800 rounded-lg flex items-center justify-center">
            {deck.trackInfo?.url ? (
              <WaveformVisualizer
                deck={deck}
                color="#10b981"
                height={80}
                animated={true}
                showControls={false}
                enableBeatDetection={true}
                frequencyColoring={true}
                stereoMode={false}
                theme="dark"
                playing={isPlaying}
                currentTime={currentTime}
                duration={duration}
              />
            ) : (
              <div className="text-gray-500 text-sm">Load track to see professional waveform</div>
            )}
          </div>

          {/* Progress Bar with Enhanced Features */}
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

          {/* Basic Volume and Pitch Controls */}
          <div className="grid grid-cols-2 gap-4">
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
                <span className="text-sm text-gray-400">Pitch</span>
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
          </div>
        </CardContent>
      </Card>

      {/* Professional DJ Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BPM and Transport Controls */}
        <div className="space-y-4">
          <BPMDisplay deck={deck} otherDeck={otherDeck} />
          <TransportControls deck={deck} />
        </div>
        
        {/* Cue Points and Loops */}
        <div className="space-y-4">
          <CuePointControl deck={deck} />
          <LoopControl deck={deck} />
        </div>
      </div>
    </div>
  );
}

interface ProfessionalMixerProps {
  mixer: DJMixer;
  crossfaderPosition: number;
  masterVolume: number;
  onCrossfaderChange: (position: number) => void;
  onMasterVolumeChange: (volume: number) => void;
}

function ProfessionalMixer({ mixer, crossfaderPosition, masterVolume, onCrossfaderChange, onMasterVolumeChange }: ProfessionalMixerProps) {
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

  const handleAutoMix = () => {
    // Professional auto-mix feature placeholder
    console.log('Auto-mix activated');
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-center flex items-center justify-center">
          <Radio className="w-5 h-5 mr-2" />
          Professional Mixer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Crossfader */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Deck A</span>
            <span className="text-sm text-gray-400 font-semibold">Crossfader</span>
            <span className="text-sm text-gray-400">Deck B</span>
          </div>
          <div className="relative">
            <Slider
              value={[crossfaderPosition * 100]}
              max={100}
              step={1}
              onValueChange={handleCrossfaderChange}
              className="w-full"
              data-testid="slider-crossfader"
            />
            {/* Crossfader position indicator */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>A</span>
              <span>Center</span>
              <span>B</span>
            </div>
          </div>
        </div>

        {/* Master Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400 font-semibold">Master Volume</span>
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

        {/* Professional Controls */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="border-blue-600 text-blue-400 hover:bg-blue-900"
            onClick={handleSyncTempos}
            data-testid="button-sync-tempos"
          >
            <Music className="w-4 h-4 mr-1" />
            Sync
          </Button>
          
          <Button
            variant="outline"
            className="border-purple-600 text-purple-400 hover:bg-purple-900"
            onClick={handleAutoMix}
            data-testid="button-auto-mix"
          >
            <Settings className="w-4 h-4 mr-1" />
            Auto Mix
          </Button>
        </div>

        {/* Headphone Controls */}
        <div className="space-y-2 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-center">
            <Headphones className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-sm text-gray-400">Headphone Cue</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-400 hover:bg-green-900"
              data-testid="button-cue-a"
            >
              Cue A
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-400 hover:bg-green-900"
              data-testid="button-cue-b"
            >
              Cue B
            </Button>
          </div>
        </div>

        {/* Mixer Stats */}
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 text-center mb-2">Mixer Status</div>
          <div className="grid grid-cols-2 gap-4 text-xs text-center">
            <div>
              <div className="text-gray-400">Position</div>
              <div className="text-white font-mono">
                {crossfaderPosition < 0.4 ? 'A' : crossfaderPosition > 0.6 ? 'B' : 'Center'}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Level</div>
              <div className="text-white font-mono">{Math.round(masterVolume * 100)}%</div>
            </div>
          </div>
        </div>
      </CardContent>
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
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Track Library</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center p-8 border-2 border-dashed border-gray-600 rounded-lg">
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-400 mb-4">
            Track library will be available with user authentication
          </div>
          <div className="text-sm text-gray-500">
            For now, use the "Load Track" buttons on each deck to load audio files directly
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfessionalDJPage() {
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
  
  // Visual effects state
  const [showFullScreenVisualizer, setShowFullScreenVisualizer] = useState(false);
  const [showVisualizationControls, setShowVisualizationControls] = useState(false);
  const [visualizationSettings, setVisualizationSettings] = useState({
    theme: {
      name: 'Dark Club',
      primaryColor: '#00d4ff',
      secondaryColor: '#ff0080',
      accentColor: '#ffff00',
      backgroundColor: '#000000',
      colorMode: 'gradient' as const,
      saturation: 1.0,
      brightness: 1.0,
      contrast: 1.0
    },
    effects: {
      particles: { enabled: true, count: 100, size: 3, speed: 2, life: 180, shape: 'circle' as const, blendMode: 'screen' as const, trail: true, trailLength: 15 },
      waveform: { enabled: true, style: 'line' as const, thickness: 2, smoothing: 0.3, colorMode: 'gradient' as const, beatPulse: true },
      spectrum: { enabled: true, bars: 128, logScale: true, peakHold: true, smoothing: 0.3, colorMode: 'gradient' as const, beatReactive: true },
      visual3d: { enabled: false, type: 'tunnel' as const, intensity: 0.8, speed: 1.0, rotation: true, morphing: false }
    },
    performance: { quality: 'high' as const, targetFps: 60, enableWebGL: true, enablePostProcessing: true, enableMotionBlur: false, enableBloom: true, antiAliasing: true },
    reactivity: { beatSensitivity: 0.8, frequencySensitivity: 0.7, energyThreshold: 0.3, beatPrediction: true, autoAdjust: true, transientDetection: true, keySync: false },
    display: { showBeatIndicator: true, showBpmCounter: true, showFrequencyBands: true, showEnergyMeter: false, showPerformanceStats: false, fullScreenMode: false, multiMonitor: false }
  });
  
  const handleVisualizationSettingsChange = (category: string, settings: any) => {
    setVisualizationSettings(prev => ({...prev, [category]: settings}));
  };

  const { toast } = useToast();

  useEffect(() => {
    // Initialize mixer connections and default effects
    mixer.deckA.connectTo(mixer.inputA);
    mixer.deckB.connectTo(mixer.inputB);
    mixer.connectToOutput();
    
    // Initialize default effects for each deck
    mixer.deckA.initializeDefaultEffects();
    mixer.deckB.initializeDefaultEffects();
    
    console.log('DJ Mixer initialized with professional effects system');

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
      // Clear event callbacks to prevent memory leaks
      mixer.deckA.onTimeUpdate(() => {});
      mixer.deckA.onPlayStateChange(() => {});
      mixer.deckB.onTimeUpdate(() => {});
      mixer.deckB.onPlayStateChange(() => {});
    };
  }, [mixer]);

  const handleLoadTrackA = async (file: File) => {
    try {
      const audioUrl = URL.createObjectURL(file);
      
      const trackInfo: DJTrackInfo = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist",
        duration: 0,
        file: file,
        url: audioUrl,
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

  const handleLoadTrackB = async (file: File) => {
    try {
      const audioUrl = URL.createObjectURL(file);
      
      const trackInfo: DJTrackInfo = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Unknown Artist", 
        duration: 0,
        file: file,
        url: audioUrl,
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

  const handleLoadTrackToDeck = async (track: DjTrack, deckId: string) => {
    toast({
      title: "Feature coming soon",
      description: "Loading tracks from library will be available with user authentication",
    });
  };

  const handleTrackGenerated = async (track: SunoTrackResult, deckId: string) => {
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

  const handleMoodTrackGenerated = async (track: SunoTrackResult, deckId: string) => {
    await handleTrackGenerated(track, deckId);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Professional DJ Studio</h1>
          <p className="text-gray-400">Industry-standard dual-deck mixing with advanced professional controls</p>
        </div>

        {/* Professional DJ Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Deck A - Left Side */}
          <div className="space-y-4">
            <ProfessionalDeck
              deck={mixer.deckA}
              otherDeck={mixer.deckB}
              deckLabel="Deck A"
              onLoadTrack={handleLoadTrackA}
              currentTime={deckAState.currentTime}
              duration={deckAState.duration}
              isPlaying={deckAState.isPlaying}
              volume={deckAState.volume}
              pitchPercentage={deckAState.pitchPercentage}
              onVolumeChange={(volume) => setDeckAState(prev => ({ ...prev, volume }))}
              onPitchChange={(pitch) => setDeckAState(prev => ({ ...prev, pitchPercentage: pitch }))}
            />
            
            {/* Deck A Effects Section */}
            <div className="space-y-3">
              {/* EQ Panel */}
              <EqualizerPanel
                deck={mixer.deckA}
                deckLabel="Deck A"
                size="md"
                showFrequencyResponse={true}
                data-testid="eq-panel-deck-a"
              />
              
              {/* Effects Rack */}
              <EffectsRack
                deck={mixer.deckA}
                deckLabel="Deck A"
                maxEffects={4}
                showEQ={false}
                data-testid="effects-rack-deck-a"
              />
              
              {/* Effect Presets */}
              <div className="flex justify-center">
                <EffectPresets
                  deck={mixer.deckA}
                  deckLabel="Deck A"
                  data-testid="effect-presets-deck-a"
                />
              </div>
            </div>
          </div>

          {/* Center - Mixer and Global Controls */}
          <div className="space-y-4">
            <ProfessionalMixer
              mixer={mixer}
              crossfaderPosition={mixerState.crossfaderPosition}
              masterVolume={mixerState.masterVolume}
              onCrossfaderChange={(position) => setMixerState(prev => ({ ...prev, crossfaderPosition: position }))}
              onMasterVolumeChange={(volume) => setMixerState(prev => ({ ...prev, masterVolume: volume }))}
            />
            
            {/* Track Browser */}
            <TrackBrowser onLoadTrackToDeck={handleLoadTrackToDeck} />
          </div>

          {/* Deck B - Right Side */}
          <div className="space-y-4">
            <ProfessionalDeck
              deck={mixer.deckB}
              otherDeck={mixer.deckA}
              deckLabel="Deck B"
              onLoadTrack={handleLoadTrackB}
              currentTime={deckBState.currentTime}
              duration={deckBState.duration}
              isPlaying={deckBState.isPlaying}
              volume={deckBState.volume}
              pitchPercentage={deckBState.pitchPercentage}
              onVolumeChange={(volume) => setDeckBState(prev => ({ ...prev, volume }))}
              onPitchChange={(pitch) => setDeckBState(prev => ({ ...prev, pitchPercentage: pitch }))}
            />
            
            {/* Deck B Effects Section */}
            <div className="space-y-3">
              {/* EQ Panel */}
              <EqualizerPanel
                deck={mixer.deckB}
                deckLabel="Deck B"
                size="md"
                showFrequencyResponse={true}
                data-testid="eq-panel-deck-b"
              />
              
              {/* Effects Rack */}
              <EffectsRack
                deck={mixer.deckB}
                deckLabel="Deck B"
                maxEffects={4}
                showEQ={false}
                data-testid="effects-rack-deck-b"
              />
              
              {/* Effect Presets */}
              <div className="flex justify-center">
                <EffectPresets
                  deck={mixer.deckB}
                  deckLabel="Deck B"
                  data-testid="effect-presets-deck-b"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Visual Effects System */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Professional Visual Effects</h2>
            <p className="text-gray-400">Real-time spectrum analysis and beat-reactive visualizations</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Spectrum Analyzer */}
            <SpectrumAnalyzer
              deck={mixer.deckA.isPlaying ? mixer.deckA : mixer.deckB}
              width={600}
              height={300}
              showControls={true}
              enableBeatDetection={true}
              theme="dark"
            />
            
            {/* Beat-Reactive Visuals */}
            <BeatReactiveVisuals
              deck={mixer.deckA.isPlaying ? mixer.deckA : mixer.deckB}
              otherDeck={mixer.deckA.isPlaying ? mixer.deckB : mixer.deckA}
              width={600}
              height={300}
              autoStart={true}
            />
          </div>

          {/* Visualization Controls */}
          {showVisualizationControls && (
            <VisualizationControls
              onSettingsChange={handleVisualizationSettingsChange}
              currentSettings={visualizationSettings}
            />
          )}

          {/* Visualization Control Buttons */}
          <div className="text-center space-x-4">
            <Button
              onClick={() => setShowVisualizationControls(!showVisualizationControls)}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-visualization-controls"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showVisualizationControls ? 'Hide' : 'Show'} Visual Controls
            </Button>
            <Button
              onClick={() => setShowFullScreenVisualizer(true)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-fullscreen-visualizer"
            >
              <Music className="w-4 h-4 mr-2" />
              Launch Full-Screen Visuals
            </Button>
          </div>
        </div>

        {/* Full-Screen Visualizer */}
        <FullScreenVisualizer
          deck={mixer.deckA.isPlaying ? mixer.deckA : mixer.deckB}
          otherDeck={mixer.deckA.isPlaying ? mixer.deckB : mixer.deckA}
          isVisible={showFullScreenVisualizer}
          onClose={() => setShowFullScreenVisualizer(false)}
          enableRecording={true}
        />

        {/* AI Generation and Mood Controls - Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Suno AI Generator */}
          <div>
            <SunoGenerator onTrackGenerated={handleTrackGenerated} />
          </div>

          {/* Mood Controls */}
          <div>
            <MoodMenu onTrackGenerated={handleMoodTrackGenerated} />
          </div>
          
          {/* Mood Journey Tracker */}
          <div>
            <MoodJourneyTracker />
          </div>
        </div>
        
        {/* Professional DJ Footer */}
        <div className="text-center text-gray-500 text-sm border-t border-gray-800 pt-4">
          <div className="flex items-center justify-center space-x-4">
            <span>Professional DJ Console v2.0</span>
            <span>•</span>
            <span>Industry-Standard Controls</span>
            <span>•</span>
            <span>AI-Powered Music Generation</span>
          </div>
        </div>
      </div>
    </div>
  );
}