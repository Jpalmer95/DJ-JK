import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, Play, Pause, Trash, Music } from "lucide-react";

interface BaseTrackUploaderProps {
  onVolumeChange: (volume: number) => void;
}

const BaseTrackUploader = ({ onVolumeChange }: BaseTrackUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Set up audio element
  useEffect(() => {
    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        
        // Add event listeners
        audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.addEventListener('loadedmetadata', handleMetadataLoaded);
        audioRef.current.addEventListener('ended', handleAudioEnded);
      } else {
        audioRef.current.src = audioUrl;
      }
      
      // Set volume
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleMetadataLoaded);
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
  }, [audioUrl]);
  
  // Update audio volume when volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  // Notify parent component when volume changes
  useEffect(() => {
    onVolumeChange(volume);
  }, [volume, onVolumeChange]);
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedFile = e.target.files[0];
      
      // Check if it's an audio file or video (which also has audio)
      const acceptedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/hevc'];
      if (!uploadedFile.type.startsWith('audio/') && !acceptedVideoTypes.includes(uploadedFile.type)) {
        alert('Please upload an audio file (MP3, WAV) or video file (MP4, MOV, HEVC)');
        return;
      }
      
      setFile(uploadedFile);
      
      // Create object URL for the audio file
      const url = URL.createObjectURL(uploadedFile);
      setAudioUrl(url);
      
      // Reset playback state
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };
  
  // Play/pause the audio
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Handle audio time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  // Handle audio metadata loaded
  const handleMetadataLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  // Handle audio ended
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };
  
  // Remove the uploaded file
  const removeFile = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setFile(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Format time in MM:SS format
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Handle seeking
  const handleSeek = (newValue: number[]) => {
    const seekTime = newValue[0];
    setCurrentTime(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Music className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="font-medium text-gray-800">Base Track</h3>
        </div>
        {file && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={removeFile}
            className="text-red-500 hover:text-red-700"
          >
            <Trash className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>
      
      {!file ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="audio/*,video/mp4,video/quicktime,video/x-msvideo,video/hevc"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
          <Button 
            variant="outline" 
            className="mb-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Audio/Video File
          </Button>
          <p className="text-sm text-gray-500">
            Upload an MP3, WAV, MP4, MOV, HEVC or other audio/video file to use as background music
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm truncate font-medium">
            {file.name}
          </div>
          
          {/* Playback controls */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full"
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <div className="w-full space-y-1">
              <Slider 
                value={[currentTime]} 
                min={0} 
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
          
          {/* Volume control */}
          <div className="flex items-center space-x-4">
            <Label htmlFor="base-track-volume" className="text-sm whitespace-nowrap w-20">
              Volume:
            </Label>
            <Slider 
              id="base-track-volume"
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseTrackUploader;