import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { decodeRecording, RecordedSequence, playNote, startBeat, stopBeat } from "@/lib/audio";
import PianoGrid from "@/components/PianoGrid";

export default function Share() {
  const [, params] = useRoute<{ id: string }>("/share/:id");
  const { toast } = useToast();
  const [recording, setRecording] = useState<RecordedSequence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume] = useState(0.8);
  
  // Fetch the shared recording
  useEffect(() => {
    if (!params?.id) return;
    
    const fetchRecording = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest<{ recording: string }>(`/api/share/${params.id}`);
        
        if (response && response.recording) {
          const decodedRecording = decodeRecording(response.recording);
          if (decodedRecording) {
            setRecording(decodedRecording);
          } else {
            throw new Error('Invalid recording data');
          }
        }
      } catch (error) {
        console.error('Error fetching recording:', error);
        toast({
          title: "Failed to load recording",
          description: "This shared music piece couldn't be loaded.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecording();
  }, [params?.id, toast]);
  
  // Play the recording
  const playRecording = useCallback(() => {
    if (!recording || isPlaying) return;
    
    setIsPlaying(true);
    
    // Start the beat if one was used
    if (recording.beatPattern && recording.beatPattern !== 'none') {
      startBeat(recording.beatPattern, volume);
    }
    
    // Play each note at its recorded time
    recording.notes.forEach(note => {
      setTimeout(() => {
        const gridElement = document.querySelector(`[data-note-index="${note.noteIndex}"]`);
        if (gridElement) {
          gridElement.classList.add('played');
          setTimeout(() => gridElement.classList.remove('played'), 300);
          
          // Get the note name from the data attribute
          const noteName = gridElement.getAttribute('data-note') || 'C4';
          
          // Play the note with the recorded sound mode
          playNote(noteName, volume, recording.soundMode);
        }
      }, note.time);
    });
    
    // Calculate total duration of the recording
    const lastNote = recording.notes.reduce((max, note) => 
      note.time > max.time ? note : max, recording.notes[0]);
      
    // Set a timeout to mark when playback is done
    setTimeout(() => {
      setIsPlaying(false);
      stopBeat();
    }, lastNote.time + 1500);
    
  }, [recording, volume, isPlaying]);
  
  return (
    <div className="min-h-screen w-full font-inter text-gray-800">
      {/* Header */}
      <header className="w-full py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold font-poppins text-blue-600">
              Shared Music
            </h1>
            <Link href="/">
              <Button variant="outline" className="rounded-full shadow-sm hover:bg-gray-50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Studio
              </Button>
            </Link>
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading shared creation...</p>
            </div>
          ) : recording ? (
            <>
              <div className="mb-6 bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-gray-600">
                  Someone shared a musical creation with you! 
                  Press play to listen.
                </p>
              </div>
              
              {/* Display the grid (readonly) */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4 mb-8">
                {recording.notes.length > 0 && (() => {
                  // Define piano notes for our grid (same as in PianoGrid component)
                  const NOTES = [
                    'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
                    'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
                    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
                    'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
                    'C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6'
                  ];
                  
                  // Use middle range notes as default 
                  const startNoteIndex = 7; // Start from C3
                  
                  // Get theme color based on sound mode
                  const getThemeColor = (soundMode: string) => {
                    const colorMap: Record<string, string> = {
                      'piano': 'blue',
                      'synth': 'purple',
                      'chiptune': 'green',
                      'funk': 'pink'
                    };
                    return colorMap[soundMode] || 'blue';
                  };
                  
                  // Configure theme colors (same as PianoGrid)
                  const THEME_COLORS: Record<string, string[]> = {
                    blue: [
                      'bg-blue-400', 'bg-blue-500', 'bg-blue-600',
                      'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600'
                    ],
                    purple: [
                      'bg-purple-400', 'bg-purple-500', 'bg-purple-600',
                      'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600'
                    ],
                    pink: [
                      'bg-pink-400', 'bg-pink-500', 'bg-pink-600',
                      'bg-rose-400', 'bg-rose-500', 'bg-rose-600'
                    ],
                    green: [
                      'bg-green-400', 'bg-green-500', 'bg-green-600',
                      'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600'
                    ]
                  };
                  
                  const themeColor = getThemeColor(recording.soundMode);
                  const maxNoteIndex = Math.max(...recording.notes.map(n => n.noteIndex)) + 1;
                  
                  return Array.from({ length: maxNoteIndex }, (_, i) => {
                    const noteIndex = (startNoteIndex + i) % NOTES.length;
                    const note = NOTES[noteIndex];
                    const colorIndex = i % THEME_COLORS[themeColor].length;
                    const colorClass = THEME_COLORS[themeColor][colorIndex];
                    
                    return (
                      <div 
                        key={i}
                        data-note-index={i}
                        data-note={note}
                        className={`${colorClass} rounded-xl shadow-md flex items-center justify-center aspect-square relative overflow-hidden`}
                      >
                        <span className="note-label text-xs text-white text-opacity-60 absolute bottom-1 right-1 font-medium">
                          {note}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* Playback controls */}
              <div className="flex justify-center mt-6">
                <Button
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-full shadow-md"
                  onClick={playRecording}
                  disabled={isPlaying}
                >
                  <Play className="h-5 w-5 mr-2" />
                  {isPlaying ? "Playing..." : "Play Music"}
                </Button>
              </div>
              
              {/* Info about the shared piece */}
              <div className="mt-8 text-center text-sm text-gray-500">
                <p>This piece uses the "{recording.soundMode}" sound with
                {recording.beatPattern !== 'none' 
                  ? ` a "${recording.beatPattern}" beat pattern.` 
                  : ' no background beat.'}
                </p>
                <p className="mt-2">It contains {recording.notes.length} notes.</p>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Recording Not Found</h2>
              <p className="text-gray-600 mb-6">
                The shared music piece you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Create Your Own
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}