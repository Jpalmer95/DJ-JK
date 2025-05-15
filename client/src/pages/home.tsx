import { useState, useRef, useEffect } from "react";
import { HelpCircle, Settings, RefreshCw, MicIcon, StopCircle, Play } from "lucide-react";
import PianoGrid from "@/components/PianoGrid";
import HelpModal from "@/components/modals/HelpModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { Button } from "@/components/ui/button";
import { initAudioContext } from "@/lib/audio";

// Define the types for our recorded notes
interface RecordedNote {
  noteIndex: number;
  time: number;
}

export default function Home() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSequence, setRecordedSequence] = useState<RecordedNote[]>([]);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [themeColor, setThemeColor] = useState<string>("blue");
  
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
    
    recordedSequence.forEach(item => {
      setTimeout(() => {
        pianoGridRef.current.playNoteByIndex(item.noteIndex);
      }, item.time);
    });
  };

  // Reset everything
  const handleReset = () => {
    setIsRecording(false);
    setRecordedSequence([]);
    setHasRecorded(false);
    recordingStartTimeRef.current = null;
  };

  // Save settings
  const handleSaveSettings = (newVolume: number, newAnimationsEnabled: boolean, newThemeColor: string) => {
    setVolume(newVolume);
    setAnimationsEnabled(newAnimationsEnabled);
    setThemeColor(newThemeColor);
    setIsSettingsOpen(false);
  };

  return (
    <div className="min-h-screen w-full font-inter text-gray-800">
      {/* Header */}
      <header className="w-full py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold font-poppins text-blue-600">Piano Tiles</h1>
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
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Instructions */}
          <div className="mb-6 bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-gray-600">Tap on the tiles to play piano notes!</p>
          </div>

          {/* Piano Grid */}
          <PianoGrid 
            ref={pianoGridRef}
            onNotePlayed={handleNotePlayed} 
            volume={volume}
            animationsEnabled={animationsEnabled}
            themeColor={themeColor}
          />

          {/* Controls */}
          <div className="flex justify-center space-x-4 mt-8">
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
              <Button 
                variant="default"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 shadow-sm text-white font-medium"
                onClick={playbackRecording}
              >
                <Play className="h-4 w-4 mr-2" />
                Play
              </Button>
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
    </div>
  );
}
