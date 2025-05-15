import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Trash, Music, Upload } from "lucide-react";
import { hasCustomSound, setCustomSound, clearCustomSounds } from "@/lib/audio";
import { Label } from "@/components/ui/label";

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
  const [selectedNote, setSelectedNote] = useState<string>(AVAILABLE_NOTES[0]);
  const [uploadedSounds, setUploadedSounds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
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
  
  // Handle clearing all custom sounds
  const handleClearAllSounds = () => {
    if (confirm('Are you sure you want to clear all custom sounds?')) {
      clearCustomSounds();
      setUploadedSounds([]);
    }
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
        
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Music className="h-4 w-4 mr-2" />
              Upload Custom Sounds
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select a note and upload a sound file to assign to it. When you use the "Custom Sounds" mode, 
              your sounds will play instead of the default piano tones.
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
      </DialogContent>
    </Dialog>
  );
};

export default CustomSoundsModal;