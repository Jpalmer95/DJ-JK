import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music, Disc3, Grid3X3, Mic, Square, Play, Share2, Settings,
  HelpCircle, ChevronLeft, ChevronRight, Layers, Radio,
  Zap, ListMusic, Volume2, Headphones, Eye, Save, Tag, Clock, Trash2, Pause,
  GripVertical, Sparkles, Info, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import PianoGrid from "@/components/PianoGrid";
import Soundboard from "@/components/Soundboard";
import HelpModal from "@/components/modals/HelpModal";
import SettingsModal from "@/components/modals/SettingsModal";
import ShareModal from "@/components/modals/ShareModal";
import CustomSoundsModal from "@/components/modals/CustomSoundsModal";
import BaseTrackUploader from "@/components/BaseTrackUploader";
import DeckPanel from "@/components/DeckPanel";
import SpectrumAnalyzer from "@/components/dj/SpectrumAnalyzer";
import BeatReactiveVisuals from "@/components/dj/BeatReactiveVisuals";
import FullScreenVisualizer from "@/components/dj/FullScreenVisualizer";
import SunoGenerator from "@/components/SunoGenerator";
import MoodMenu from "@/components/MoodMenu";
import { DJMixer, DJTrackInfo } from "@/lib/djAudio";
import type { SunoTrackResult } from "@/lib/sunoApi";
import {
  initAudioContext,
  playNote,
  type SoundMode,
  type BeatPattern,
  startBeat,
  stopBeat
} from "@/lib/audio";

type ViewMode = "performance" | "mixstudio" | "recordings" | "visuals";
type StudioMode = "party" | "studio";

interface RecordedNote {
  noteIndex: number;
  time: number;
}

import type { LucideIcon } from "lucide-react";

type NavItemId = ViewMode | "soundboard";

const NAV_ITEMS: { id: NavItemId; icon: LucideIcon; label: string }[] = [
  { id: "performance", icon: Grid3X3, label: "Perform" },
  { id: "mixstudio", icon: Disc3, label: "Mix Studio" },
  { id: "soundboard", icon: Layers, label: "Soundboard" },
  { id: "recordings", icon: ListMusic, label: "Recordings" },
  { id: "visuals", icon: Eye, label: "Visuals" },
];

function SoundboardOverlay({ onClose }: { onClose: () => void }) {
  const [pos, setPos] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("sb-pos") || "{}"); return { x: s.x ?? window.innerWidth - 460, y: s.y ?? window.innerHeight - 520 }; }
    catch { return { x: window.innerWidth - 460, y: window.innerHeight - 520 }; }
  });
  const [size, setSize] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("sb-size") || "{}"); return { w: s.w ?? 420, h: s.h ?? 480 }; }
    catch { return { w: 420, h: 480 }; }
  });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const nx = Math.max(0, Math.min(ev.clientX - dragOffset.current.x, window.innerWidth - size.w));
      const ny = Math.max(0, Math.min(ev.clientY - dragOffset.current.y, window.innerHeight - size.h));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setPos(p => { localStorage.setItem("sb-pos", JSON.stringify(p)); return p; });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [pos, size.w, size.h]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resizing.current = true;
    const startX = e.clientX, startY = e.clientY;
    const startW = size.w, startH = size.h;
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const nw = Math.max(320, Math.min(startW + ev.clientX - startX, window.innerWidth - pos.x));
      const nh = Math.max(300, Math.min(startH + ev.clientY - startY, window.innerHeight - pos.y));
      setSize({ w: nw, h: nh });
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setSize(s => { localStorage.setItem("sb-size", JSON.stringify(s)); return s; });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [size, pos]);

  return (
    <div className="fixed z-50 flex flex-col glass-panel rounded-xl neon-border-magenta shadow-2xl shadow-fuchsia-500/20 overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h, backdropFilter: "blur(20px)" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 cursor-grab active:cursor-grabbing select-none shrink-0"
        onMouseDown={onDragStart}>
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 text-white/30" />
          <Layers className="w-4 h-4 neon-text-magenta" />
          <span className="text-sm font-bold text-white/80">Soundboard</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/30 hover:text-white/60"
          onClick={onClose}>
          <Square className="w-3 h-3" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <Soundboard />
      </div>
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={onResizeStart}>
        <svg className="w-4 h-4 text-white/20" viewBox="0 0 16 16">
          <path d="M14 16L16 14M10 16L16 10M6 16L16 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  const [activeView, setActiveView] = useState<ViewMode>("performance");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [studioMode, setStudioMode] = useState<StudioMode>(() =>
    (localStorage.getItem("studio-mode") as StudioMode) || "party"
  );

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCustomSoundsOpen, setIsCustomSoundsOpen] = useState(false);
  const [soundboardOverlayOpen, setSoundboardOverlayOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(() => {
    const seen = localStorage.getItem("onboarding-done");
    return seen ? -1 : 0;
  });
  const [showQuickStart, setShowQuickStart] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedSequence, setRecordedSequence] = useState<RecordedNote[]>([]);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recordingName, setRecordingName] = useState("");
  const [recordingTags, setRecordingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [savedRecordings, setSavedRecordings] = useState<Array<{
    id: string; name: string; tags: string[]; notes: RecordedNote[];
    soundMode: SoundMode; beatPattern: BeatPattern; date: number; duration: number;
  }>>(() => {
    try { return JSON.parse(localStorage.getItem("saved-recordings") || "[]"); }
    catch { return []; }
  });
  const [isPlayingBack, setIsPlayingBack] = useState(false);

  const [volume, setVolume] = useState(0.8);
  const [baseTrackVolume, setBaseTrackVolume] = useState(0.5);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [themeColor, setThemeColor] = useState("blue");
  const [currentSoundMode, setCurrentSoundMode] = useState<SoundMode>("synth");
  const [currentBeatPattern, setCurrentBeatPattern] = useState<BeatPattern>("none");
  const [beatEnabled, setBeatEnabled] = useState(false);
  const [gridSizeMultiplier, setGridSizeMultiplier] = useState(1);

  const recordingStartTimeRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pianoGridRef = useRef<import("@/components/PianoGrid").PianoGridHandle | null>(null);

  const [mixer] = useState(() => new DJMixer());
  const [deckAState, setDeckAState] = useState({ currentTime: 0, duration: 0, isPlaying: false, volume: 1, pitchPercentage: 0 });
  const [deckBState, setDeckBState] = useState({ currentTime: 0, duration: 0, isPlaying: false, volume: 1, pitchPercentage: 0 });
  const [mixerState, setMixerState] = useState({ crossfaderPosition: 0.5, masterVolume: 1 });
  const [showFullScreenVisualizer, setShowFullScreenVisualizer] = useState(false);

  useEffect(() => {
    const initAudio = () => { initAudioContext(); window.removeEventListener("click", initAudio); };
    window.addEventListener("click", initAudio);
    return () => window.removeEventListener("click", initAudio);
  }, []);

  useEffect(() => {
    if (beatEnabled) startBeat(currentBeatPattern, volume);
    else stopBeat();
    return () => { stopBeat(); };
  }, [beatEnabled, currentBeatPattern, volume]);

  useEffect(() => {
    mixer.deckA.initializeDefaultEffects();
    mixer.deckB.initializeDefaultEffects();
    mixer.deckA.onTimeUpdate((time) => setDeckAState(prev => ({ ...prev, currentTime: time })));
    mixer.deckA.onPlayStateChange((isPlaying) => setDeckAState(prev => ({ ...prev, isPlaying })));
    mixer.deckB.onTimeUpdate((time) => setDeckBState(prev => ({ ...prev, currentTime: time })));
    mixer.deckB.onPlayStateChange((isPlaying) => setDeckBState(prev => ({ ...prev, isPlaying })));
    return () => {
      mixer.deckA.onTimeUpdate(() => {});
      mixer.deckA.onPlayStateChange(() => {});
      mixer.deckB.onTimeUpdate(() => {});
      mixer.deckB.onPlayStateChange(() => {});
    };
  }, [mixer]);

  const toggleStudioMode = () => {
    const next = studioMode === "party" ? "studio" : "party";
    setStudioMode(next);
    localStorage.setItem("studio-mode", next);
    toast({ title: next === "party" ? "Party Mode" : "Studio Mode", description: next === "party" ? "Simplified controls for maximum fun" : "Full controls unlocked" });
  };

  const handleNotePlayed = (noteIndex: number) => {
    if (isRecording) {
      const currentTime = Date.now();
      if (recordingStartTimeRef.current === null) recordingStartTimeRef.current = currentTime;
      setRecordedSequence(prev => [...prev, { noteIndex, time: currentTime - (recordingStartTimeRef.current || 0) }]);
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRecording) {
      timer = setInterval(() => setRecordingElapsed(Date.now() - (recordingStartTimeRef.current || Date.now())), 100);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const clearCountdown = () => {
    if (countdownRef.current) { clearTimeout(countdownRef.current); countdownRef.current = null; }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordedSequence.length > 0) {
        setHasRecorded(true);
        setRecordingName(`Recording ${savedRecordings.length + 1}`);
      }
    } else if (countdown !== null) {
      clearCountdown();
      setCountdown(null);
    } else {
      setCountdown(3);
      const tick = (n: number) => {
        if (n <= 0) {
          countdownRef.current = null;
          setCountdown(null);
          setIsRecording(true);
          setRecordedSequence([]);
          recordingStartTimeRef.current = Date.now();
          setRecordingElapsed(0);
          setHasRecorded(false);
        } else {
          setCountdown(n);
          countdownRef.current = setTimeout(() => tick(n - 1), 1000);
        }
      };
      countdownRef.current = setTimeout(() => tick(2), 1000);
    }
  };

  const playbackRecording = useCallback((notes?: RecordedNote[], mode?: SoundMode, pattern?: BeatPattern) => {
    const seq = notes || recordedSequence;
    if (seq.length === 0 || !pianoGridRef.current) return;
    if (mode && mode !== currentSoundMode) setCurrentSoundMode(mode);
    const useBeat = pattern ?? (beatEnabled ? currentBeatPattern : "none");
    if (useBeat && useBeat !== "none") startBeat(useBeat as BeatPattern, volume);
    setIsPlayingBack(true);
    const maxTime = Math.max(...seq.map(n => n.time));
    seq.forEach(item => {
      setTimeout(() => pianoGridRef.current?.playNoteByIndex(item.noteIndex), item.time);
    });
    setTimeout(() => { setIsPlayingBack(false); if (useBeat && useBeat !== "none") stopBeat(); }, maxTime + 500);
  }, [recordedSequence, beatEnabled, currentBeatPattern, currentSoundMode, volume]);

  const saveRecording = () => {
    if (recordedSequence.length === 0) return;
    const maxTime = Math.max(...recordedSequence.map(n => n.time));
    const rec = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: recordingName || `Recording ${savedRecordings.length + 1}`,
      tags: recordingTags,
      notes: recordedSequence,
      soundMode: currentSoundMode,
      beatPattern: beatEnabled ? currentBeatPattern : "none" as BeatPattern,
      date: Date.now(),
      duration: maxTime,
    };
    const updated = [rec, ...savedRecordings];
    setSavedRecordings(updated);
    localStorage.setItem("saved-recordings", JSON.stringify(updated));
    setHasRecorded(false);
    setRecordedSequence([]);
    setRecordingName("");
    setRecordingTags([]);
    toast({ title: "Recording saved!", description: `"${rec.name}" saved to your library` });
  };

  const deleteRecording = (id: string) => {
    const updated = savedRecordings.filter(r => r.id !== id);
    setSavedRecordings(updated);
    localStorage.setItem("saved-recordings", JSON.stringify(updated));
    toast({ title: "Recording deleted" });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !recordingTags.includes(t)) {
      setRecordingTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const handleSoundModeChange = (mode: SoundMode) => {
    setCurrentSoundMode(mode);
    if (mode === "custom") setIsCustomSoundsOpen(true);
  };

  const handleSaveSettings = (newVolume: number, newAnimationsEnabled: boolean, newThemeColor: string) => {
    setVolume(newVolume);
    setAnimationsEnabled(newAnimationsEnabled);
    setThemeColor(newThemeColor);
    setIsSettingsOpen(false);
  };

  const getRecordingData = () => ({
    notes: recordedSequence,
    soundMode: currentSoundMode,
    beatPattern: beatEnabled ? currentBeatPattern : "none" as BeatPattern,
  });

  const handleLoadTrack = async (file: File, deckId: "A" | "B") => {
    try {
      const audioUrl = URL.createObjectURL(file);
      const trackInfo: DJTrackInfo = { title: file.name.replace(/\.[^/.]+$/, ""), artist: "Unknown Artist", duration: 0, file, url: audioUrl };
      const deck = deckId === "A" ? mixer.deckA : mixer.deckB;
      const setDeckState = deckId === "A" ? setDeckAState : setDeckBState;
      await deck.loadTrack(file, trackInfo);
      setDeckState(prev => ({ ...prev, duration: deck.duration, currentTime: 0, volume: deck.volume, pitchPercentage: deck.getPitchPercentage() }));
      toast({ title: `Track loaded to Deck ${deckId}`, description: `${trackInfo.title} is ready` });
    } catch {
      toast({ title: "Failed to load track", variant: "destructive" });
    }
  };

  const handleTrackGenerated = async (track: SunoTrackResult, deckId: string) => {
    try {
      const deck = deckId === "Deck A" ? mixer.deckA : mixer.deckB;
      const setDeckState = deckId === "Deck A" ? setDeckAState : setDeckBState;
      const trackInfo: DJTrackInfo = { title: track.title, artist: track.artist, duration: track.duration, url: track.audioUrl, bpm: track.bpm, key: track.key };
      await deck.loadTrack(track.audioUrl, trackInfo);
      setDeckState(prev => ({ ...prev, duration: deck.duration, currentTime: 0, volume: deck.volume, pitchPercentage: deck.getPitchPercentage() }));
      toast({ title: `AI Track loaded to ${deckId}`, description: `"${track.title}" ready` });
    } catch {
      toast({ title: "Failed to load AI track", variant: "destructive" });
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-dark-gradient bg-grid-pattern font-inter text-white">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? "w-16" : "w-48"} flex-shrink-0 glass-panel border-r border-white/5 flex flex-col transition-all duration-300`}>
        <div className="p-3 flex items-center gap-2 border-b border-white/5">
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold neon-text-cyan tracking-wide truncate">SYNTH PARTY</h1>
              <p className="text-[9px] text-white/30 uppercase tracking-widest">DJ Studio</p>
            </div>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/30 hover:text-cyan-400" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map(item => {
            if (item.id === "soundboard") {
              return (
                <button
                  key={item.id}
                  onClick={() => setSoundboardOverlayOpen(prev => !prev)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all
                    ${soundboardOverlayOpen
                      ? "bg-fuchsia-500/15 text-fuchsia-300 neon-border-magenta"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate text-xs font-medium">{item.label}</span>}
                </button>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ViewMode)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all
                  ${activeView === item.id
                    ? "bg-cyan-500/15 text-cyan-300 neon-border"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate text-xs font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-white/5 space-y-1">
          <button
            onClick={toggleStudioMode}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all
              ${studioMode === "studio" ? "bg-fuchsia-500/15 text-fuchsia-300 neon-border-magenta" : "bg-cyan-500/15 text-cyan-300 neon-border"}`}
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate font-medium">{studioMode === "party" ? "Party Mode" : "Studio Mode"}</span>}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate font-medium">Settings</span>}
          </button>
          <button onClick={() => setIsHelpOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate font-medium">Help</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Performance View */}
        {activeView === "performance" && (
          <div className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold neon-text-cyan">Performance</h2>
                <p className="text-xs text-white/30">Tap pads to create music</p>
              </div>
              <div className="flex items-center gap-2">
                {isRecording && (
                  <div className="flex items-center gap-1.5 glass-panel px-2 py-1 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-red-400 font-mono font-medium">{formatDuration(recordingElapsed)}</span>
                    <span className="text-[10px] text-white/30">{recordedSequence.length} notes</span>
                  </div>
                )}
                {countdown !== null && (
                  <div className="flex items-center gap-1.5 glass-panel px-2 py-1 rounded-lg">
                    <Clock className="w-3 h-3 text-yellow-400 animate-pulse" />
                    <span className="text-xs text-yellow-400 font-mono font-bold">{countdown}</span>
                  </div>
                )}
                <Button variant="ghost" size="sm" className={`h-8 ${isRecording || countdown !== null ? "text-red-400 hover:text-red-300" : "text-cyan-400 hover:text-cyan-300"}`} onClick={toggleRecording}>
                  {isRecording ? <><Square className="w-3.5 h-3.5 mr-1" />Stop</> : countdown !== null ? <><Square className="w-3.5 h-3.5 mr-1" />Cancel</> : <><Mic className="w-3.5 h-3.5 mr-1" />Record</>}
                </Button>
                {hasRecorded && (
                  <>
                    <Button variant="ghost" size="sm" className="h-8 text-emerald-400 hover:text-emerald-300" disabled={isPlayingBack} onClick={() => playbackRecording()}><Play className="w-3.5 h-3.5 mr-1" />{isPlayingBack ? "Playing..." : "Play"}</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-fuchsia-400 hover:text-fuchsia-300" onClick={() => setIsShareOpen(true)}><Share2 className="w-3.5 h-3.5 mr-1" />Share</Button>
                  </>
                )}
              </div>
            </div>

            {/* Sound Controls */}
            <div className="glass-panel rounded-xl p-4 neon-border">
              <div className="flex flex-wrap gap-2 mb-4">
                {(["piano", "synth", "chiptune", "funk", "custom"] as SoundMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => handleSoundModeChange(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                      ${currentSoundMode === mode
                        ? "bg-cyan-500/20 text-cyan-300 neon-border shadow-[0_0_10px_rgba(0,255,255,0.2)]"
                        : "text-white/40 hover:text-white/60 border border-white/5 hover:border-white/10"}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {studioMode === "studio" && (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={beatEnabled} onCheckedChange={setBeatEnabled} />
                    <Label className="text-xs text-white/50">Beat</Label>
                  </div>
                  {beatEnabled && (
                    <Select value={currentBeatPattern} onValueChange={(v) => setCurrentBeatPattern(v as BeatPattern)}>
                      <SelectTrigger className="w-40 h-7 text-xs bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic 4/4</SelectItem>
                        <SelectItem value="groove">Groove</SelectItem>
                        <SelectItem value="electro">Electronic</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30">Grid</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(s => (
                        <button key={s} onClick={() => setGridSizeMultiplier(s)}
                          className={`w-6 h-6 rounded text-[10px] font-mono transition-all
                            ${gridSizeMultiplier === s ? "bg-cyan-500/30 text-cyan-300 neon-border" : "text-white/30 hover:text-white/50 bg-white/5"}`}>
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              {countdown !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 rounded-xl backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-7xl font-bold neon-text-cyan animate-pulse" style={{ textShadow: "0 0 30px rgba(0,229,255,0.8)" }}>{countdown}</div>
                    <p className="text-white/40 text-sm mt-2">Get ready...</p>
                  </div>
                </div>
              )}
              <PianoGrid
                ref={pianoGridRef}
                onNotePlayed={handleNotePlayed}
                volume={volume}
                animationsEnabled={animationsEnabled}
                themeColor={themeColor}
                soundMode={currentSoundMode}
                gridSizeMultiplier={gridSizeMultiplier}
                compact={studioMode === "party"}
              />
            </div>

            {studioMode === "studio" && (
              <div className="glass-panel rounded-xl neon-border overflow-hidden">
                <BaseTrackUploader onVolumeChange={setBaseTrackVolume} />
              </div>
            )}
          </div>
        )}

        {/* Mix Studio View */}
        {activeView === "mixstudio" && (
          <div className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold neon-text-purple">Mix Studio</h2>
                <p className="text-xs text-white/30">Dual-deck mixing with professional controls</p>
              </div>
              <div className="flex gap-2">
                <SunoGenerator onLoadToDeck={handleTrackGenerated} />
                <MoodMenu onLoadToDeck={handleTrackGenerated} />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <DeckPanel deck={mixer.deckA} otherDeck={mixer.deckB} label="Deck A" state={deckAState} setState={setDeckAState} onLoadTrack={handleLoadTrack} studioMode={studioMode} />

              <div className="space-y-3">
                <div className="glass-panel rounded-xl p-4 neon-border">
                  <h4 className="text-xs font-bold text-center neon-text-magenta uppercase tracking-wider mb-4">Mixer</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] text-white/40 mb-1"><span>A</span><span>Crossfader</span><span>B</span></div>
                      <Slider value={[mixerState.crossfaderPosition * 100]} max={100} step={1} onValueChange={([v]) => { mixer.setCrossfader(v / 100); setMixerState(p => ({ ...p, crossfaderPosition: v / 100 })); }} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-white/40 mb-1"><Volume2 className="w-3 h-3" /><span>Master {Math.round(mixerState.masterVolume * 100)}%</span></div>
                      <Slider value={[mixerState.masterVolume * 100]} max={100} step={1} onValueChange={([v]) => { mixer.setMasterVolume(v / 100); setMixerState(p => ({ ...p, masterVolume: v / 100 })); }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30 text-xs" onClick={() => mixer.syncTempos()}>
                        <Music className="w-3 h-3 mr-1" />Sync
                      </Button>
                      <Button variant="outline" size="sm" className="border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-900/30 text-xs">
                        <Radio className="w-3 h-3 mr-1" />Auto
                      </Button>
                    </div>
                  </div>
                </div>

                {studioMode === "studio" && (
                  <div className="glass-panel rounded-xl p-4 neon-border">
                    <h4 className="text-xs font-bold text-center text-white/50 uppercase tracking-wider mb-3">Headphone Cue</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30 text-xs"><Headphones className="w-3 h-3 mr-1" />Cue A</Button>
                      <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30 text-xs"><Headphones className="w-3 h-3 mr-1" />Cue B</Button>
                    </div>
                  </div>
                )}
              </div>

              <DeckPanel deck={mixer.deckB} otherDeck={mixer.deckA} label="Deck B" state={deckBState} setState={setDeckBState} onLoadTrack={handleLoadTrack} studioMode={studioMode} />
            </div>
          </div>
        )}

        {/* Recordings View */}
        {activeView === "recordings" && (
          <div className="p-4 lg:p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: "hsl(150, 100%, 45%)", textShadow: "0 0 7px hsla(150,100%,45%,0.6)" }}>Recordings</h2>
              <p className="text-xs text-white/30">Your saved compositions</p>
            </div>

            {hasRecorded && (
              <div className="glass-panel rounded-xl p-6 neon-border space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/80 text-sm font-medium">Unsaved Recording</p>
                    <p className="text-white/30 text-xs">{recordedSequence.length} notes &middot; {formatDuration(recordedSequence.length > 0 ? Math.max(...recordedSequence.map(n => n.time)) : 0)}</p>
                  </div>
                  <Button size="sm" className="h-8 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20" disabled={isPlayingBack} onClick={() => playbackRecording()}>
                    <Play className="w-3.5 h-3.5 mr-1" />{isPlayingBack ? "Playing..." : "Preview"}
                  </Button>
                </div>

                <div className="h-12 glass-panel rounded-lg p-2 flex items-end gap-px overflow-hidden">
                  {recordedSequence.length > 0 && (() => {
                    const maxTime = Math.max(...recordedSequence.map(n => n.time));
                    const bins = 64;
                    const counts = new Array(bins).fill(0);
                    recordedSequence.forEach(n => { const bin = Math.min(Math.floor((n.time / Math.max(maxTime, 1)) * bins), bins - 1); counts[bin]++; });
                    const maxCount = Math.max(...counts, 1);
                    return counts.map((c, i) => (
                      <div key={i} className="flex-1 rounded-t transition-all" style={{
                        height: `${Math.max((c / maxCount) * 100, 4)}%`,
                        background: `linear-gradient(to top, rgba(0,229,255,${0.3 + (c / maxCount) * 0.7}), rgba(155,77,255,${0.2 + (c / maxCount) * 0.5}))`,
                      }} />
                    ));
                  })()}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Name</label>
                    <Input value={recordingName} onChange={e => setRecordingName(e.target.value)} placeholder="Name your recording..."
                      className="bg-black/30 border-white/10 text-white h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Tags</label>
                    <div className="flex gap-2">
                      <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag..."
                        className="bg-black/30 border-white/10 text-white h-8 text-sm flex-1"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}} />
                      <Button size="sm" variant="outline" className="h-8 border-white/10 text-white/50 hover:text-white" onClick={addTag}>
                        <Tag className="w-3 h-3" />
                      </Button>
                    </div>
                    {recordingTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {recordingTags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/20 transition-colors"
                            onClick={() => setRecordingTags(prev => prev.filter(t => t !== tag))}>{tag} &times;</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30" onClick={saveRecording}>
                    <Save className="w-4 h-4 mr-2" />Save Recording
                  </Button>
                  <Button className="bg-fuchsia-600/30 hover:bg-fuchsia-600/50 text-fuchsia-300 border border-fuchsia-500/30" onClick={() => setIsShareOpen(true)}>
                    <Share2 className="w-4 h-4 mr-2" />Share
                  </Button>
                  <Button variant="ghost" className="text-white/30 hover:text-red-400" onClick={() => { setHasRecorded(false); setRecordedSequence([]); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {savedRecordings.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/50">Library ({savedRecordings.length})</h3>
                {savedRecordings.map(rec => (
                  <div key={rec.id} className="glass-panel rounded-xl p-4 neon-border flex items-center gap-4 group">
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-full shrink-0"
                      onClick={() => { setActiveView("performance"); setTimeout(() => playbackRecording(rec.notes, rec.soundMode, rec.beatPattern), 300); }}>
                      <Play className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 font-medium truncate">{rec.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-white/30">
                        <span>{rec.notes.length} notes</span>
                        <span>&middot;</span>
                        <span>{formatDuration(rec.duration)}</span>
                        <span>&middot;</span>
                        <span className="capitalize">{rec.soundMode}</span>
                        <span>&middot;</span>
                        <span>{new Date(rec.date).toLocaleDateString()}</span>
                      </div>
                      {rec.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {rec.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded-full text-[9px] bg-white/5 text-white/30">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteRecording(rec.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : !hasRecorded ? (
              <div className="glass-panel rounded-xl p-8 neon-border flex flex-col items-center justify-center" style={{ minHeight: "50vh" }}>
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                    <ListMusic className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">No recordings yet</p>
                  <p className="text-white/20 text-xs">Go to Performance and hit Record to capture your creation</p>
                  <Button variant="outline" size="sm" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30" onClick={() => setActiveView("performance")}>
                    <Grid3X3 className="w-3.5 h-3.5 mr-1.5" />Go to Performance
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Visuals View */}
        {activeView === "visuals" && (
          <div className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "hsl(270, 100%, 60%)", textShadow: "0 0 7px hsla(270,100%,60%,0.6)" }}>Visuals</h2>
                <p className="text-xs text-white/30">Real-time audio visualizations</p>
              </div>
              <Button className="bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/30" onClick={() => setShowFullScreenVisualizer(true)}>
                <Eye className="w-4 h-4 mr-2" />Full Screen
              </Button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="glass-panel rounded-xl p-4 neon-border overflow-hidden">
                <h4 className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3">Spectrum Analyzer</h4>
                <SpectrumAnalyzer deck={mixer.deckA.isPlaying ? mixer.deckA : mixer.deckB} width={600} height={250} showControls={studioMode === "studio"} enableBeatDetection theme="dark" />
              </div>
              <div className="glass-panel rounded-xl p-4 neon-border-magenta overflow-hidden">
                <h4 className="text-xs font-bold neon-text-magenta uppercase tracking-wider mb-3">Beat Reactive</h4>
                <BeatReactiveVisuals deck={mixer.deckA.isPlaying ? mixer.deckA : mixer.deckB} otherDeck={mixer.deckA.isPlaying ? mixer.deckB : mixer.deckA} width={600} height={250} autoStart />
              </div>
            </div>
            <FullScreenVisualizer deck={mixer.deckA.isPlaying ? mixer.deckA : mixer.deckB} otherDeck={mixer.deckA.isPlaying ? mixer.deckB : mixer.deckA} isVisible={showFullScreenVisualizer} onClose={() => setShowFullScreenVisualizer(false)} enableRecording />
          </div>
        )}
      </main>

      {/* Floating Soundboard Overlay */}
      {soundboardOverlayOpen && <SoundboardOverlay onClose={() => setSoundboardOverlayOpen(false)} />}

      {/* Modals */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} volume={volume} animationsEnabled={animationsEnabled} themeColor={themeColor} onSave={handleSaveSettings} />
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} recording={hasRecorded ? getRecordingData() : null} />
      <CustomSoundsModal isOpen={isCustomSoundsOpen} onClose={() => setIsCustomSoundsOpen(false)} />

      {/* Onboarding Tooltips */}
      <AnimatePresence>
        {onboardingStep >= 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={() => { setOnboardingStep(-1); localStorage.setItem("onboarding-done", "1"); }} />
            <motion.div
              key={onboardingStep}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="pointer-events-auto absolute glass-panel rounded-xl neon-border p-5 max-w-sm shadow-2xl shadow-cyan-500/20"
              style={
                onboardingStep === 0 ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" } :
                onboardingStep === 1 ? { top: "30%", left: "90px" } :
                onboardingStep === 2 ? { bottom: "120px", left: "90px" } :
                { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
              }
            >
              {onboardingStep === 0 && (
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold neon-text-cyan">Welcome to Synth Party!</h3>
                  <p className="text-white/60 text-sm">Your next-gen DJ board and music studio. Let's get you started with a quick tour.</p>
                </div>
              )}
              {onboardingStep === 1 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white/90">Synth Launchpad</h3>
                  </div>
                  <p className="text-white/50 text-xs">Tap the neon pads to play sounds! Try different sound modes (Synth, Piano, Drums) and enable beat patterns for instant grooves.</p>
                </div>
              )}
              {onboardingStep === 2 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-fuchsia-400" />
                    <h3 className="text-sm font-bold text-white/90">Soundboard & Recording</h3>
                  </div>
                  <p className="text-white/50 text-xs">Open the floating Soundboard to trigger DJ samples. Hit Record to capture your performance, then name and save it to your library.</p>
                </div>
              )}
              {onboardingStep === 3 && (
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-fuchsia-500/20 flex items-center justify-center mx-auto">
                    <Zap className="w-6 h-6 text-fuchsia-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white/90">Party Mode vs Studio Mode</h3>
                  <p className="text-white/50 text-xs">You're starting in Party Mode with simplified controls. Switch to Studio Mode anytime from the sidebar to unlock the full Mix Studio, advanced effects, and EQ controls.</p>
                  <Button size="sm" className="bg-fuchsia-600/30 hover:bg-fuchsia-600/50 text-fuchsia-300 mt-2"
                    onClick={() => { setShowQuickStart(true); setOnboardingStep(-1); localStorage.setItem("onboarding-done", "1"); }}>
                    <Sparkles className="w-3 h-3 mr-1" /> Show Quick-Start Presets
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                <span className="text-[10px] text-white/30">{onboardingStep + 1} / 4</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-white/40 text-xs h-7" onClick={() => { setOnboardingStep(-1); localStorage.setItem("onboarding-done", "1"); }}>
                    Skip
                  </Button>
                  <Button size="sm" className="bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-xs h-7"
                    onClick={() => {
                      if (onboardingStep < 3) setOnboardingStep(s => s + 1);
                      else { setOnboardingStep(-1); localStorage.setItem("onboarding-done", "1"); }
                    }}>
                    {onboardingStep < 3 ? "Next" : "Get Started"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick-Start Presets Modal */}
      <AnimatePresence>
        {showQuickStart && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowQuickStart(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative glass-panel rounded-2xl neon-border-magenta p-6 max-w-lg w-full mx-4 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-fuchsia-400" />
                  <h2 className="text-lg font-bold text-white/90">Quick-Start Presets</h2>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/30 hover:text-white/60" onClick={() => setShowQuickStart(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-white/40 mb-4">Pick a preset to instantly configure your sound and start jamming:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "EDM Drop", sound: "synth" as SoundMode, beat: "fourOnFloor" as BeatPattern, icon: Zap, border: "border-cyan-500/20 hover:border-cyan-500/50", iconColor: "text-cyan-400" },
                  { name: "Lo-Fi Chill", sound: "piano" as SoundMode, beat: "none" as BeatPattern, icon: Music, border: "border-violet-500/20 hover:border-violet-500/50", iconColor: "text-violet-400" },
                  { name: "Drum Machine", sound: "drums" as SoundMode, beat: "breakbeat" as BeatPattern, icon: Radio, border: "border-rose-500/20 hover:border-rose-500/50", iconColor: "text-rose-400" },
                  { name: "Synth Wave", sound: "synth" as SoundMode, beat: "house" as BeatPattern, icon: Disc3, border: "border-fuchsia-500/20 hover:border-fuchsia-500/50", iconColor: "text-fuchsia-400" },
                  { name: "Acoustic Jam", sound: "piano" as SoundMode, beat: "none" as BeatPattern, icon: Headphones, border: "border-amber-500/20 hover:border-amber-500/50", iconColor: "text-amber-400" },
                  { name: "Trap Beat", sound: "drums" as SoundMode, beat: "trap" as BeatPattern, icon: Volume2, border: "border-emerald-500/20 hover:border-emerald-500/50", iconColor: "text-emerald-400" },
                ].map(preset => (
                  <button
                    key={preset.name}
                    className={`glass-panel rounded-xl p-4 text-left transition-all hover:brightness-125 border ${preset.border} group`}
                    onClick={() => {
                      setCurrentSoundMode(preset.sound);
                      if (preset.beat !== "none") {
                        setCurrentBeatPattern(preset.beat);
                        setBeatEnabled(true);
                      } else {
                        setBeatEnabled(false);
                      }
                      setShowQuickStart(false);
                      setActiveView("performance");
                      toast({ title: `${preset.name} Loaded!`, description: `Sound: ${preset.sound}, Beat: ${preset.beat === "none" ? "off" : preset.beat}` });
                    }}
                  >
                    <preset.icon className={`w-5 h-5 ${preset.iconColor} mb-2`} />
                    <p className="text-sm font-semibold text-white/80">{preset.name}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{preset.sound} + {preset.beat === "none" ? "no beat" : preset.beat}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
