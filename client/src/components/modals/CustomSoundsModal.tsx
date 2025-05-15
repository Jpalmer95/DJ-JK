import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Trash, Music, Upload, Mic, Square, Play, Edit2, Save } from "lucide-react";
import { hasCustomSound, setCustomSound, clearCustomSounds } from "@/lib/audio";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const CustomSoundsModal = ({ isOpen, onClose }: CustomSoundsModalProps) => {
  // Basic state
  const [selectedNote, setSelectedNote] = useState<string>(AVAILABLE_NOTES[0]);
  const [uploadedSounds, setUploadedSounds] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<'upload' | 'record'>('upload');
  
  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Update the uploaded sounds list when the modal opens
  useEffect(() => {
    if (isOpen) {
      refreshUploadedSounds();
    }
  }, [isOpen]);
  
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });
      
      mediaRecorder.addEventListener('stop', () => {
        // Create blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        
        // Create preview URL
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordingPreviewUrl(audioUrl);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      });
      
      // Start recording
      mediaRecorder.start();
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
      // Set the custom sound for the selected note
      setCustomSound(selectedNote, recordedBlob);
      
      // Update the list of uploaded sounds
      refreshUploadedSounds();
      
      // Reset recording state
      setRecordedBlob(null);
      setRecordingPreviewUrl(null);
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
    }
  };
  
  // Toggle between edit and play modes
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
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
          <div className="space-y-4">
            <Tabs defaultValue="upload" value={currentTab} onValueChange={(val) => setCurrentTab(val as 'upload' | 'record')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="record">Record</TabsTrigger>
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
            </Tabs>
            
            {uploadedSounds.length > 0 && (
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