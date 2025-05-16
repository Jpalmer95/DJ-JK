import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Trash, Music, Upload, Mic, Square, Play, Edit2, Save, Move, BarChart2 } from "lucide-react";
import AudioPreview from "@/components/AudioPreview";
import { 
  hasCustomSound, 
  setCustomSound, 
  clearCustomSounds, 
  getSoundLibrary, 
  LibrarySound,
  moveCustomSound
} from "@/lib/audio";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface CustomSoundsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Piano notes for our grid
const AVAILABLE_NOTES = [
  'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'
];

// Define DnD types
const ItemTypes = {
  SOUND: 'sound',
};

// Sound item component (draggable)
interface DraggableSoundProps {
  note: string;
  onDragStart?: () => void;
}

const DraggableSound: React.FC<DraggableSoundProps> = ({ note, onDragStart }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SOUND,
    item: () => {
      if (onDragStart) onDragStart();
      return { note };
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`bg-gray-100 p-2 rounded-md text-center text-sm cursor-move flex items-center justify-between 
        ${isDragging ? 'opacity-50' : ''}
        ${hasCustomSound(note) ? 'border-blue-400 border-2' : 'border border-gray-300'}`}
      style={{ cursor: 'grab' }}
    >
      <span>{note}</span>
      <Move className="h-4 w-4 ml-2 text-gray-500" />
    </div>
  );
};

// Drop target component
interface SoundDropTargetProps {
  note: string;
  onDrop: (item: { note: string }, targetNote: string) => void;
  children?: React.ReactNode;
}

const SoundDropTarget: React.FC<SoundDropTargetProps> = ({ note, onDrop, children }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.SOUND,
    drop: (item: { note: string }) => {
      onDrop(item, note);
      return undefined;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }));

  // Visual indicator for drop target
  const isActive = isOver && canDrop;
  const backgroundColor = isActive
    ? 'bg-blue-100'
    : hasCustomSound(note)
    ? 'bg-gray-50'
    : 'bg-white';

  return (
    <div
      ref={drop}
      className={`border-2 ${
        isActive ? 'border-blue-500' : hasCustomSound(note) ? 'border-green-500' : 'border-gray-200'
      } p-2 rounded-md ${backgroundColor} transition-colors`}
      style={{ minHeight: '60px' }}
    >
      {children}
    </div>
  )
};

const CustomSoundsModal = ({ isOpen, onClose }: CustomSoundsModalProps) => {
  // Basic state
  const [selectedNote, setSelectedNote] = useState<string>(AVAILABLE_NOTES[0]);
  const [uploadedSounds, setUploadedSounds] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<'upload' | 'record' | 'library' | 'arrange'>('upload');
  const [draggedSound, setDraggedSound] = useState<string | null>(null);
  const [soundLibrary, setSoundLibrary] = useState<LibrarySound[]>([]);
  const [selectedLibrarySound, setSelectedLibrarySound] = useState<LibrarySound | null>(null);
  
  // Grid state for arrangement
  const [soundArrangement, setSoundArrangement] = useState<Record<string, string>>({});
  
  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null);
  
  // File upload state
  const [uploadedFilePreviewUrl, setUploadedFilePreviewUrl] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Update the uploaded sounds list when the modal opens
  useEffect(() => {
    if (isOpen) {
      refreshUploadedSounds();
      loadSoundLibrary();
    } else {
      // Clean up any URL objects to prevent memory leaks when closing the modal
      if (recordingPreviewUrl) {
        URL.revokeObjectURL(recordingPreviewUrl);
        setRecordingPreviewUrl(null);
      }
      if (uploadedFilePreviewUrl) {
        URL.revokeObjectURL(uploadedFilePreviewUrl);
        setUploadedFilePreviewUrl(null);
      }
    }
  }, [isOpen]);
  
  // Load sounds from library
  const loadSoundLibrary = () => {
    const sounds = getSoundLibrary();
    setSoundLibrary(sounds);
  };
  
  // Reset preview URLs when changing notes
  useEffect(() => {
    // Clean up previous URLs
    if (uploadedFilePreviewUrl) {
      URL.revokeObjectURL(uploadedFilePreviewUrl);
      setUploadedFilePreviewUrl(null);
    }
  }, [selectedNote]);
  
  // Refresh the list of uploaded sounds
  const refreshUploadedSounds = () => {
    const sounds = AVAILABLE_NOTES.filter(note => hasCustomSound(note));
    setUploadedSounds(sounds);
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if it's an audio or video file
      if (!file.type.startsWith('audio/') && 
          !['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/hevc'].includes(file.type)) {
        alert('Please upload an audio file (MP3, WAV) or video file (MP4, MOV, HEVC)');
        return;
      }
      
      // Create a blob from the file
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const blob = new Blob([event.target.result], { type: file.type });
          
          // Create a URL for the blob to display the waveform
          const audioUrl = URL.createObjectURL(blob);
          setUploadedFilePreviewUrl(audioUrl);
          
          // Set the custom sound for the selected note
          setCustomSound(selectedNote, blob);
          
          // Update the list of uploaded sounds
          refreshUploadedSounds();
          
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };
  
  // Audio recording functions
  const startRecording = async () => {
    try {
      // Reset recording state
      audioChunksRef.current = [];
      setRecordedBlob(null);
      setRecordingPreviewUrl(null);
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Priority list for audio formats - we prioritize formats with better browser support
      const supportedTypes = [
        // Common format supported by most browsers
        'audio/webm;codecs=opus',  // Modern standard, well supported
        'audio/webm',              // Generic WebM
        
        // iOS/Safari friendly formats
        'audio/mp4',               // iOS/Safari 
        'audio/mp4;codecs=mp4a',   // Explicit codec for Safari
        
        // Fallback options
        'audio/mpeg',              // MP3 format
        'audio/ogg;codecs=opus',   // OGG format
        'audio/wav',               // WAV format (large files)
      ];
      
      // Find the first supported format
      let mimeType = '';
      for (const type of supportedTypes) {
        try {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log(`Using supported MIME type: ${mimeType}`);
            break;
          }
        } catch (err) {
          console.warn(`Error checking support for ${type}:`, err);
        }
      }
      
      // If no supported format found, use default format
      if (!mimeType) {
        mimeType = 'audio/webm'; // Default fallback
        console.warn('No explicitly supported format found, using fallback: audio/webm');
      }
      
      // Create MediaRecorder options
      const options: MediaRecorderOptions = {
        mimeType,
        audioBitsPerSecond: 128000 // 128 kbps for reasonable quality
      };
      
      // Create a MediaRecorder with the best available format
      try {
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
      } catch (error) {
        console.error("Error creating MediaRecorder:", error);
        // Fallback to basic options if needed
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
      }
      
      if (!mediaRecorderRef.current) {
        throw new Error("Failed to create MediaRecorder");
      }
      
      // Set up event handlers
      mediaRecorderRef.current.addEventListener('dataavailable', (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });
      
      mediaRecorderRef.current.addEventListener('stop', () => {
        try {
          // Safety check for empty audio chunks
          if (audioChunksRef.current.length === 0) {
            throw new Error("No audio data recorded");
          }
          
          // Create blob from chunks with the same MIME type
          // Ensure we have a valid MIME type, fall back to 'audio/webm' if not
          const blobType = mimeType || 'audio/webm';
          
          // Create a blob with a known size to verify it's not corrupt
          const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
          
          if (audioBlob.size < 100) {
            // Too small, likely corrupt
            throw new Error("Recorded audio is too small or corrupt");
          }
          
          setRecordedBlob(audioBlob);
          
          // Create preview URL and test it
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordingPreviewUrl(audioUrl);
          
          // Create a test audio element to verify the blob works
          const testAudio = new Audio(audioUrl);
          testAudio.oncanplaythrough = () => {
            console.log(`Recording verified and ready to use with format: ${blobType}`);
          };
          
          testAudio.onerror = () => {
            console.warn(`Recording format ${blobType} may not be fully supported`);
            // We still keep the recording as it might work with Howler.js
          };
          
          console.log(`Recording completed successfully with format: ${blobType}`);
        } catch (error) {
          console.error('Error processing recording:', error);
          alert('Failed to process the recording. Please try again with a shorter recording.');
        } finally {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      });
      
      // Start recording with 10ms timeslices for more frequent data events
      mediaRecorderRef.current.start(10);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions and try again.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const saveRecording = () => {
    if (recordedBlob) {
      try {
        if (recordedBlob.size < 100) {
          throw new Error("Recording is too small or corrupt");
        }
        
        // Check if we already have too many custom sounds
        const existingSounds = AVAILABLE_NOTES.filter(note => hasCustomSound(note));
        if (existingSounds.length > 15) {
          // Show a warning if we have many sounds already
          const confirmSave = confirm(
            "You already have many custom sounds which may affect performance. Continue adding more?"
          );
          if (!confirmSave) return;
        }
        
        // Set the custom sound for the selected note
        setCustomSound(selectedNote, recordedBlob);
        
        // Show success message
        console.log(`Recording saved to note ${selectedNote}`);
        
        // Update the list of uploaded sounds
        refreshUploadedSounds();
        
        // Reset recording state
        setRecordedBlob(null);
        setRecordingPreviewUrl(null);
        
        // Clean up any URL objects to prevent memory leaks
        if (recordingPreviewUrl) {
          URL.revokeObjectURL(recordingPreviewUrl);
        }
      } catch (error) {
        console.error('Error saving recording:', error);
        alert(`Failed to save recording to note ${selectedNote}. Please try recording again with a different microphone or for a shorter duration.`);
      }
    } else {
      alert("No recording to save. Please record a sound first.");
    }
  };
  
  // Preview recorded audio
  const playRecordingPreview = () => {
    if (previewAudioRef.current && recordingPreviewUrl) {
      previewAudioRef.current.play();
    }
  };
  
  // Handle clearing all custom sounds
  const handleClearAllSounds = () => {
    if (confirm('Are you sure you want to clear all custom sounds?')) {
      clearCustomSounds();
      setUploadedSounds([]);
      setSoundArrangement({});
    }
  };
  
  // Toggle between edit and play modes
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };
  
  // Apply library sound to selected note
  const applyLibrarySound = (librarySound: LibrarySound) => {
    if (!librarySound || !librarySound.blob) {
      alert('No sound selected or sound is invalid.');
      return;
    }
    
    setCustomSound(selectedNote, librarySound.blob);
    refreshUploadedSounds();
    
    // Show feedback
    console.log(`Applied "${librarySound.name}" to note ${selectedNote}`);
  };
  
  // Handle drop for drag-and-drop functionality
  const handleSoundDrop = (sourceItem: { note: string }, targetNote: string) => {
    if (sourceItem.note === targetNote) return; // No need to move to same position
    
    // Ensure there's a sound to move
    if (!hasCustomSound(sourceItem.note)) {
      alert(`No sound assigned to ${sourceItem.note} to move.`);
      return;
    }
    
    // Update our arrangement mapping
    setSoundArrangement(prev => ({
      ...prev,
      [targetNote]: sourceItem.note
    }));
    
    console.log(`Moved sound from ${sourceItem.note} to ${targetNote}`);
  };
  
  // Handle rearrangement by moving the sounds between notes
  const applyArrangement = () => {
    // Get all the arrangements to apply
    const arrangements = Object.entries(soundArrangement);
    if (arrangements.length === 0) return;
    
    let successCount = 0;
    let failCount = 0;
    
    // Apply each arrangement in the order they were added
    arrangements.forEach(([targetNote, sourceNote]) => {
      try {
        // Use the imported moveCustomSound function directly
        const success = moveCustomSound(sourceNote, targetNote);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error applying arrangement from ${sourceNote} to ${targetNote}:`, error);
        failCount++;
      }
    });
    
    // Show results to the user
    if (failCount === 0) {
      alert(`Success! All ${successCount} sound arrangements have been applied.`);
    } else {
      alert(`Applied ${successCount} sound arrangements with ${failCount} errors.`);
    }
    
    // Update display and clean up
    refreshUploadedSounds();
    setSoundArrangement({});
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-xl">
        <DialogHeader className="flex justify-between items-center flex-row">
          <DialogTitle className="text-xl font-bold font-poppins text-gray-800">Custom Sounds</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Music className="h-4 w-4 mr-2" />
            {isEditMode ? "Edit Mode" : "Play Mode"}
          </h3>
          <div className="flex items-center space-x-2">
            <Label htmlFor="mode-toggle" className="text-xs text-gray-500">
              {isEditMode ? "Edit" : "Play"}
            </Label>
            <Switch
              id="mode-toggle"
              checked={!isEditMode}
              onCheckedChange={(checked) => setIsEditMode(!checked)}
            />
          </div>
        </div>
        
        {isEditMode ? (
          <DndProvider backend={HTML5Backend}>
            <div className="space-y-4">
              <Tabs defaultValue="upload" value={currentTab} onValueChange={(val) => setCurrentTab(val as 'upload' | 'record' | 'library' | 'arrange')}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="record">Record</TabsTrigger>
                  <TabsTrigger value="library">Library</TabsTrigger>
                  <TabsTrigger value="arrange">Arrange</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="mt-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Sound File
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Select a note and upload a sound file to assign to it.
                    </p>
                    
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="note-select" className="block text-sm font-medium text-gray-700 mb-1">
                          Select Note
                        </Label>
                        <select 
                          id="note-select"
                          value={selectedNote}
                          onChange={(e) => setSelectedNote(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {AVAILABLE_NOTES.map((note) => (
                            <option key={note} value={note}>
                              {note} {hasCustomSound(note) ? '(Custom sound assigned)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="audio/*,video/mp4,video/quicktime,video/x-msvideo,video/hevc"
                          onChange={handleFileUpload}
                        />
                        <Button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Sound for {selectedNote}
                        </Button>
                      </div>
                      
                      {/* Waveform Visualizer for uploaded audio */}
                      {uploadedFilePreviewUrl && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                            <BarChart2 className="h-3 w-3 mr-1" />
                            Sound Preview
                          </div>
                          <AudioPreview 
                            audioUrl={uploadedFilePreviewUrl}
                            color="#3b82f6" 
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="record" className="mt-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Mic className="h-4 w-4 mr-2" />
                      Record Sound
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Record a sound using your microphone.
                    </p>
                    
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="note-select-record" className="block text-sm font-medium text-gray-700 mb-1">
                          Select Note
                        </Label>
                        <select 
                          id="note-select-record"
                          value={selectedNote}
                          onChange={(e) => setSelectedNote(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {AVAILABLE_NOTES.map((note) => (
                            <option key={note} value={note}>
                              {note} {hasCustomSound(note) ? '(Custom sound assigned)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {isRecording ? (
                          <Button 
                            variant="destructive"
                            onClick={stopRecording}
                            className="w-full"
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Stop Recording
                          </Button>
                        ) : (
                          <Button 
                            onClick={startRecording}
                            className="w-full"
                            variant={recordedBlob ? "outline" : "default"}
                          >
                            <Mic className="h-4 w-4 mr-2" />
                            {recordedBlob ? "Record Again" : "Start Recording"}
                          </Button>
                        )}
                        
                        {recordingPreviewUrl && (
                          <Button 
                            variant="outline"
                            onClick={playRecordingPreview}
                            className="w-full"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Play
                          </Button>
                        )}
                      </div>
                      
                      {/* Waveform Visualizer for recorded audio */}
                      {recordingPreviewUrl && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                            <BarChart2 className="h-3 w-3 mr-1" />
                            Sound Preview
                          </div>
                          <AudioPreview 
                            audioUrl={recordingPreviewUrl}
                            color="#10b981" 
                            compact={true}
                          />
                        </div>
                      )}
                      
                      {recordedBlob && (
                        <Button 
                          onClick={saveRecording}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save to {selectedNote}
                        </Button>
                      )}
                      
                      {/* Hidden audio for preview */}
                      {recordingPreviewUrl && (
                        <audio 
                          ref={previewAudioRef}
                          src={recordingPreviewUrl}
                          className="hidden"
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="library" className="mt-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Music className="h-4 w-4 mr-2" />
                      Sound Library
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Reuse sounds you've previously recorded or uploaded.
                    </p>
                    
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="note-select-library" className="block text-sm font-medium text-gray-700 mb-1">
                          Select Note
                        </Label>
                        <select 
                          id="note-select-library"
                          value={selectedNote}
                          onChange={(e) => setSelectedNote(e.target.value)}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {AVAILABLE_NOTES.map((note) => (
                            <option key={note} value={note}>
                              {note} {hasCustomSound(note) ? '(Custom sound assigned)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="mt-2">
                        <h4 className="text-sm font-medium mb-2">Available Sounds</h4>
                        
                        {soundLibrary.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto border rounded-md">
                            {soundLibrary.map((sound, index) => (
                              <div 
                                key={index}
                                className={`p-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center ${
                                  selectedLibrarySound === sound ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                }`}
                                onClick={() => setSelectedLibrarySound(sound)}
                              >
                                <div>
                                  <div className="font-medium text-sm">{sound.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(sound.timestamp).toLocaleString()}
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLibrarySound(sound);
                                    applyLibrarySound(sound);
                                  }}
                                  className="h-8 rounded-full"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-gray-500">
                            <p>No sounds in library.</p>
                            <p className="text-sm mt-1">Upload or record sounds first.</p>
                          </div>
                        )}
                      </div>
                      
                      {selectedLibrarySound && (
                        <Button
                          onClick={() => applyLibrarySound(selectedLibrarySound)}
                          className="w-full mt-2"
                        >
                          Apply to {selectedNote}
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="arrange" className="mt-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Move className="h-4 w-4 mr-2" />
                      Drag & Drop Arrangement
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Drag sounds from one note to another to reorganize your soundboard.
                    </p>
                    
                    {uploadedSounds.length > 0 ? (
                      <div className="space-y-4">
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Available Sounds</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {uploadedSounds.map((note) => (
                              <DraggableSound 
                                key={note} 
                                note={note}
                                onDragStart={() => setDraggedSound(note)}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Drop Zones</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {AVAILABLE_NOTES.map((note) => (
                              <SoundDropTarget 
                                key={note} 
                                note={note}
                                onDrop={handleSoundDrop}
                              >
                                <div className="text-center">
                                  <div className="font-medium">{note}</div>
                                  {soundArrangement[note] && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      ← From {soundArrangement[note]}
                                    </div>
                                  )}
                                </div>
                              </SoundDropTarget>
                            ))}
                          </div>
                        </div>
                        
                        {Object.keys(soundArrangement).length > 0 && (
                          <Button
                            onClick={applyArrangement}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Apply Arrangement
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No custom sounds available to arrange.</p>
                        <p className="text-sm mt-2">Upload or record sounds first.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              {uploadedSounds.length > 0 && currentTab !== 'arrange' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Your Custom Sounds</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedSounds.map((note) => (
                      <div key={note} className="bg-gray-100 p-2 rounded-md text-center text-sm">
                        {note}
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 text-red-500 hover:text-red-700"
                    onClick={handleClearAllSounds}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Clear All Custom Sounds
                  </Button>
                </div>
              )}
            </div>
          </DndProvider>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Soundboard Ready!</h3>
              <p className="text-sm text-gray-600">
                You're in play mode. Press the keys on the piano to play your custom sounds.
                Switch back to edit mode to add or change sounds.
              </p>
              <div className="mt-4">
                <Button 
                  onClick={toggleEditMode}
                  className="w-full"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Switch to Edit Mode
                </Button>
              </div>
            </div>
            
            {uploadedSounds.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your Custom Sounds</h3>
                <div className="grid grid-cols-3 gap-2">
                  {uploadedSounds.map((note) => (
                    <div key={note} className="bg-gray-100 p-2 rounded-md text-center text-sm font-semibold">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomSoundsModal;