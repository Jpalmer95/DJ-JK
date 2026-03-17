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

  useEffect(() => {
    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.addEventListener("timeupdate", () => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); });
        audioRef.current.addEventListener("loadedmetadata", () => { if (audioRef.current) setDuration(audioRef.current.duration); });
        audioRef.current.addEventListener("ended", () => { setIsPlaying(false); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; });
      } else {
        audioRef.current.src = audioUrl;
      }
      if (audioRef.current) audioRef.current.volume = volume;
    }
    return () => {
      if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
    };
  }, [audioUrl]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { onVolumeChange(volume); }, [volume, onVolumeChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const uploadedFile = e.target.files[0];
      const acceptedVideoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/hevc"];
      if (!uploadedFile.type.startsWith("audio/") && !acceptedVideoTypes.includes(uploadedFile.type)) return;
      setFile(uploadedFile);
      setAudioUrl(URL.createObjectURL(uploadedFile));
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const removeFile = () => {
    if (audioRef.current) audioRef.current.pause();
    setFile(null); setAudioUrl(null); setIsPlaying(false); setCurrentTime(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatTime = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Music className="h-4 w-4 text-cyan-400 mr-2" />
          <h3 className="font-medium text-sm text-white/80">Base Track</h3>
        </div>
        {file && (
          <Button variant="ghost" size="sm" onClick={removeFile} className="text-red-400/60 hover:text-red-400 h-7 text-xs">
            <Trash className="h-3 w-3 mr-1" />Remove
          </Button>
        )}
      </div>

      {!file ? (
        <div className="border border-dashed border-white/10 rounded-lg p-6 text-center">
          <input type="file" accept="audio/*,video/mp4,video/quicktime" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
          <Button variant="outline" className="mb-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />Upload Audio
          </Button>
          <p className="text-xs text-white/30">MP3, WAV, or video file</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm truncate font-medium text-white/70">{file.name}</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30" onClick={togglePlayback}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="w-full space-y-1">
              <Slider value={[currentTime]} min={0} max={duration || 100} step={0.1} onValueChange={([v]) => { setCurrentTime(v); if (audioRef.current) audioRef.current.currentTime = v; }} />
              <div className="flex justify-between text-[10px] text-white/30 font-mono">
                <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-white/40 whitespace-nowrap">Vol</Label>
            <Slider min={0} max={1} step={0.01} value={[volume]} onValueChange={([v]) => setVolume(v)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BaseTrackUploader;
