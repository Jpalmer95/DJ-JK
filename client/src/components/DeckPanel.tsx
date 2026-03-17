import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Volume2 } from "lucide-react";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import BPMDisplay from "@/components/dj/BPMDisplay";
import CuePointControl from "@/components/dj/CuePointControl";
import LoopControl from "@/components/dj/LoopControl";
import TransportControls from "@/components/dj/TransportControls";
import EqualizerPanel from "@/components/dj/EqualizerPanel";
import EffectsRack from "@/components/dj/EffectsRack";
import { DJDeck } from "@/lib/djAudio";

interface DeckState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  pitchPercentage: number;
}

interface DeckPanelProps {
  deck: DJDeck;
  otherDeck: DJDeck;
  label: string;
  state: DeckState;
  setState: (fn: (prev: DeckState) => DeckState) => void;
  onLoadTrack: (file: File, deckId: "A" | "B") => void;
  studioMode: "party" | "studio";
}

export default function DeckPanel({ deck, otherDeck, label, state, setState, onLoadTrack, studioMode }: DeckPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deckId = label === "Deck A" ? "A" : "B";

  return (
    <div className="space-y-3">
      <div className="glass-panel rounded-xl p-4 neon-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold neon-text-cyan uppercase tracking-wider">{label}</span>
          <Button variant="ghost" size="sm" className="text-cyan-400/60 hover:text-cyan-300 h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3 h-3 mr-1" /> Load
          </Button>
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLoadTrack(f, deckId as "A" | "B"); }} className="hidden" />
        </div>
        <div className="bg-black/40 rounded-lg p-2 mb-3">
          <div className="text-white text-sm font-semibold truncate">{deck.trackInfo?.title || "No Track"}</div>
          <div className="text-white/40 text-xs">{deck.trackInfo?.artist || "Load a track"}</div>
          <div className="text-cyan-400/60 text-[10px] font-mono mt-1">
            {Math.floor(state.currentTime / 60)}:{String(Math.floor(state.currentTime % 60)).padStart(2, "0")} / {Math.floor(state.duration / 60)}:{String(Math.floor(state.duration % 60)).padStart(2, "0")}
          </div>
        </div>
        <div className="h-16 bg-black/30 rounded-lg mb-3 overflow-hidden">
          {deck.trackInfo?.url ? (
            <WaveformVisualizer deck={deck} color="#00e5ff" height={64} animated showControls={false} enableBeatDetection theme="neon" playing={state.isPlaying} currentTime={state.currentTime} duration={state.duration} />
          ) : (
            <div className="flex items-center justify-center h-full text-white/20 text-xs">Waveform</div>
          )}
        </div>
        <Slider value={[state.currentTime]} max={state.duration || 1} step={0.1} onValueChange={([v]) => deck.seek(v)} className="mb-3" />
        <TransportControls deck={deck} />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
              <Volume2 className="w-3 h-3" /><span>{Math.round(state.volume * 100)}%</span>
            </div>
            <Slider value={[state.volume * 100]} max={100} step={1} onValueChange={([v]) => { deck.setVolume(v / 100); setState(p => ({ ...p, volume: v / 100 })); }} />
          </div>
          <div>
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
              <span>Pitch</span><span>{state.pitchPercentage > 0 ? "+" : ""}{state.pitchPercentage.toFixed(1)}%</span>
            </div>
            <Slider value={[state.pitchPercentage]} min={-12} max={12} step={0.1} onValueChange={([v]) => { deck.setPitchPercentage(v); setState(p => ({ ...p, pitchPercentage: v })); }} />
          </div>
        </div>
      </div>

      {studioMode === "studio" && (
        <div className="space-y-3">
          <BPMDisplay deck={deck} otherDeck={otherDeck} />
          <CuePointControl deck={deck} />
          <LoopControl deck={deck} />
          <EqualizerPanel deck={deck} deckLabel={label} size="sm" showFrequencyResponse={false} />
          <EffectsRack deck={deck} deckLabel={label} maxEffects={4} showEQ={false} />
        </div>
      )}
    </div>
  );
}
