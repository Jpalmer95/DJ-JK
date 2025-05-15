import { useState, useRef, useEffect } from "react";
import { HelpCircle, Settings, RefreshCw, MicIcon, StopCircle, Play, Share2, Music, FileAudio } from "lucide-react";
import PianoGrid from "@/components/PianoGrid";
import HelpModal from "@/components/modals/HelpModal";
import SettingsModal from "@/components/modals/SettingsModal";
import ShareModal from "@/components/modals/ShareModal";
import CustomSoundsModal from "@/components/modals/CustomSoundsModal";
import BaseTrackUploader from "@/components/BaseTrackUploader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  initAudioContext, 
  playNote, 
  type SoundMode, 
  type BeatPattern, 
  startBeat, 
  stopBeat 
} from "@/lib/audio";

// Define the types for our recorded notes
interface RecordedNote {
  noteIndex: number;
  time: number;
}

export default function Home() {
  // UI State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCustomSoundsOpen, setIsCustomSoundsOpen] = useState(false);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSequence, setRecordedSequence] = useState<RecordedNote[]>([]);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  // Audio Settings
  const [volume, setVolume] = useState(0.8);
  const [baseTrackVolume, setBaseTrackVolume] = useState(0.5);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [themeColor, setThemeColor] = useState<string>("blue");
  
  // New Sound Mode Features
  const [currentSoundMode, setCurrentSoundMode] = useState<SoundMode>("piano");
  const [currentBeatPattern, setCurrentBeatPattern] = useState<BeatPattern>("none");
  const [beatEnabled, setBeatEnabled] = useState(false);
  const [gridSizeMultiplier, setGridSizeMultiplier] = useState(1); // Grid size multiplier (1-3)
  
  const recordingStartTimeRef = useRef<number | null>(null);
  const pianoGridRef = useRef<any>(null);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      initAudioContext();
      window.removeEventListener("click", initAudio);
    };
    
    window.addEventListener("click", initAudio);
    
    // Show help modal on first visit
    const hasSeenHelp = localStorage.getItem("pianoHelpSeen");
    if (!hasSeenHelp) {
      setTimeout(() => {
        setIsHelpOpen(true);
        localStorage.setItem("pianoHelpSeen", "true");
      }, 1000);
    }
    
    return () => {
      window.removeEventListener("click", initAudio);
    };
  }, []);
  
  // Manage background beat
  useEffect(() => {
    if (beatEnabled) {
      startBeat(currentBeatPattern, volume);
    } else {
      stopBeat();
    }
    
    return () => {
      stopBeat();
    };
  }, [beatEnabled, currentBeatPattern, volume]);

  // Handle note played
  const handleNotePlayed = (noteIndex: number) => {
    if (isRecording) {
      const currentTime = Date.now();
      if (recordingStartTimeRef.current === null) {
        recordingStartTimeRef.current = currentTime;
      }
      
      setRecordedSequence(prev => [
        ...prev,
        {
          noteIndex,
          time: currentTime - (recordingStartTimeRef.current || 0)
        }
      ]);
    }
  };

  // Toggle recording state
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (recordedSequence.length > 0) {
        setHasRecorded(true);
      }
    } else {
      // Start recording
      setIsRecording(true);
      setRecordedSequence([]);
      recordingStartTimeRef.current = null;
      setHasRecorded(false);
    }
  };

  // Play back recorded sequence
  const playbackRecording = () => {
    if (recordedSequence.length === 0 || !pianoGridRef.current) return;
    
    // If there's a beat and it's enabled, start it for playback
    if (beatEnabled && currentBeatPattern !== 'none') {
      startBeat(currentBeatPattern, volume);
    }
    
    recordedSequence.forEach(item => {
      setTimeout(() => {
        pianoGridRef.current.playNoteByIndex(item.noteIndex);
      }, item.time);
    });
    
    // Calculate when playback will finish to stop the beat
    if (beatEnabled && currentBeatPattern !== 'none') {
      const lastNoteTime = Math.max(...recordedSequence.map(note => note.time));
      setTimeout(() => {
        if (!beatEnabled) stopBeat();
      }, lastNoteTime + 1000);
    }
  };

  // Reset everything
  const handleReset = () => {
    setIsRecording(false);
    setRecordedSequence([]);
    setHasRecorded(false);
    recordingStartTimeRef.current = null;
  };

  // Change sound mode
  const handleSoundModeChange = (mode: SoundMode) => {
    setCurrentSoundMode(mode);
    
    // If custom mode selected, open the custom sounds modal
    if (mode === 'custom') {
      setIsCustomSoundsOpen(true);
    }
  };
  
  // Change beat pattern
  const handleBeatPatternChange = (pattern: BeatPattern) => {
    setCurrentBeatPattern(pattern);
  };
  
  // Toggle beat on/off
  const toggleBeat = (enabled: boolean) => {
    setBeatEnabled(enabled);
  };

  // Save settings
  const handleSaveSettings = (newVolume: number, newAnimationsEnabled: boolean, newThemeColor: string) => {
    setVolume(newVolume);
    setAnimationsEnabled(newAnimationsEnabled);
    setThemeColor(newThemeColor);
    setIsSettingsOpen(false);
  };
  
  // Get the full recording data for sharing
  const getRecordingData = () => {
    return {
      notes: recordedSequence,
      soundMode: currentSoundMode,
      beatPattern: beatEnabled ? currentBeatPattern : 'none'
    };
  };

  return (
    <div className="min-h-screen w-full font-inter text-gray-800">
      {/* Header */}
      <header className="w-full py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold font-poppins text-blue-600">Music Studio</h1>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full bg-white shadow-sm hover:bg-gray-50"
                onClick={() => setIsHelpOpen(true)}
              >
                <HelpCircle className="h-5 w-5 text-gray-600" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full bg-white shadow-sm hover:bg-gray-50"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>
          
          {/* Donation Link */}
          <div className="mt-2 text-center">
            <a 
              href="https://commerce.coinbase.com/checkout/0xe0B8939Cf214DF3d6660C502CFcE3A86055631B8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <path d="M12 10.5c-1.5 0-2.7.85-2.7 1.9s1.2 1.9 2.7 1.9 2.7-.85 2.7-1.9-1.2-1.9-2.7-1.9zm0 2.8c-.8 0-1.5-.4-1.5-.9s.7-.9 1.5-.9 1.5.4 1.5.9-.7.9-1.5.9z"/>
                <path d="M15.7 8.1H8.3c-.5 0-.9.4-.9.9v2.6c0 .26.14.5.36.64h-.01l3.7 2.6c.36.26.84.26 1.2 0l3.7-2.6h-.01c.22-.14.36-.38.36-.64V9c0-.5-.4-.9-.9-.9zm-.3 3.3l-3.4 2.4-3.4-2.4V9.3h6.8v2.1z"/>
              </svg>
              Buy me a coffee
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Instrument Selector Tabs */}
          <Tabs defaultValue="soundMode" className="mb-6">
            <TabsList className="grid grid-cols-4 w-full max-w-md mx-auto">
              <TabsTrigger value="soundMode">Sound Mode</TabsTrigger>
              <TabsTrigger value="beatControl">Beat Control</TabsTrigger>
              <TabsTrigger value="gridSize">Grid Size</TabsTrigger>
              <TabsTrigger value="baseTrack">Base Track</TabsTrigger>
            </TabsList>
            
            <TabsContent value="soundMode" className="mt-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center mb-3">
                  <Music className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="font-medium">Choose Your Instrument</h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Button 
                    variant={currentSoundMode === 'piano' ? 'default' : 'outline'} 
                    className={`${currentSoundMode === 'piano' ? 'bg-blue-600 text-white' : 'bg-white'} rounded-lg`}
                    onClick={() => handleSoundModeChange('piano')}
                  >
                    Piano
                  </Button>
                  <Button 
                    variant={currentSoundMode === 'synth' ? 'default' : 'outline'} 
                    className={`${currentSoundMode === 'synth' ? 'bg-purple-600 text-white' : 'bg-white'} rounded-lg`}
                    onClick={() => handleSoundModeChange('synth')}
                  >
                    Synth
                  </Button>
                  <Button 
                    variant={currentSoundMode === 'chiptune' ? 'default' : 'outline'} 
                    className={`${currentSoundMode === 'chiptune' ? 'bg-green-600 text-white' : 'bg-white'} rounded-lg`}
                    onClick={() => handleSoundModeChange('chiptune')}
                  >
                    Chiptune
                  </Button>
                  <Button 
                    variant={currentSoundMode === 'funk' ? 'default' : 'outline'} 
                    className={`${currentSoundMode === 'funk' ? 'bg-pink-600 text-white' : 'bg-white'} rounded-lg`}
                    onClick={() => handleSoundModeChange('funk')}
                  >
                    Funk
                  </Button>
                  <Button 
                    variant={currentSoundMode === 'custom' ? 'default' : 'outline'} 
                    className={`${currentSoundMode === 'custom' ? 'bg-green-600 text-white' : 'bg-white'} rounded-lg col-span-2 sm:col-span-3`}
                    onClick={() => handleSoundModeChange('custom')}
                  >
                    <FileAudio className="h-4 w-4 mr-2" />
                    Custom Sounds
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="beatControl" className="mt-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-medium">Background Beat</div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="airplane-mode" 
                      checked={beatEnabled}
                      onCheckedChange={toggleBeat}
                    />
                    <Label htmlFor="airplane-mode">{beatEnabled ? 'On' : 'Off'}</Label>
                  </div>
                </div>
                
                <div className={`transition-opacity ${beatEnabled ? 'opacity-100' : 'opacity-50'}`}>
                  <Select 
                    value={currentBeatPattern} 
                    onValueChange={(val) => handleBeatPatternChange(val as BeatPattern)}
                    disabled={!beatEnabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a beat pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Beat (4/4)</SelectItem>
                      <SelectItem value="groove">Groove Beat (Syncopated)</SelectItem>
                      <SelectItem value="electro">Electronic Beat (Fast)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="gridSize" className="mt-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-medium">Grid Size</div>
                  <div className="text-sm text-gray-500">
                    {gridSizeMultiplier === 1 ? 'Standard' : 
                     gridSizeMultiplier === 2 ? 'Large' : 'Extra Large'}
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Standard</span>
                      <span>Large</span>
                      <span>Extra Large</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="1" 
                      value={gridSizeMultiplier}
                      onChange={(e) => setGridSizeMultiplier(parseInt(e.target.value))}
                      className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>Choose how many notes you want available:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Standard: Perfect for beginners and quick compositions</li>
                      <li>Large: More notes and octaves to explore</li>
                      <li>Extra Large: Maximum range for advanced compositions</li>
                    </ul>
                    <p className="mt-2 text-xs text-blue-600">
                      Note: On mobile devices, this will increase the number of rows while keeping the columns the same to maintain usability.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="baseTrack" className="mt-4">
              <BaseTrackUploader onVolumeChange={setBaseTrackVolume} />
            </TabsContent>
          </Tabs>

          {/* Piano Grid */}
          <PianoGrid 
            ref={pianoGridRef}
            onNotePlayed={handleNotePlayed} 
            volume={volume}
            animationsEnabled={animationsEnabled}
            themeColor={themeColor}
            soundMode={currentSoundMode}
            gridSizeMultiplier={gridSizeMultiplier}
          />

          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Button 
              variant="outline" 
              className="px-4 py-2 bg-white shadow-sm hover:bg-gray-50 text-gray-700 font-medium"
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            
            <Button 
              variant={isRecording ? "destructive" : "default"}
              className={`px-4 py-2 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} shadow-sm text-white font-medium`}
              onClick={toggleRecording}
            >
              {isRecording ? (
                <>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <MicIcon className="h-4 w-4 mr-2" />
                  Record
                </>
              )}
            </Button>
            
            {hasRecorded && (
              <>
                <Button 
                  variant="default"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 shadow-sm text-white font-medium"
                  onClick={playbackRecording}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Button>
                
                <Button 
                  variant="default"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 shadow-sm text-white font-medium"
                  onClick={() => setIsShareOpen(true)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <HelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        volume={volume}
        animationsEnabled={animationsEnabled}
        themeColor={themeColor}
        onSave={handleSaveSettings}
      />
      
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        recording={hasRecorded ? getRecordingData() : null}
      />
      
      <CustomSoundsModal
        isOpen={isCustomSoundsOpen}
        onClose={() => setIsCustomSoundsOpen(false)}
      />
    </div>
  );
}
