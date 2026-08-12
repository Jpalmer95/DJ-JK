import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Volume2, Trash2, Plus, GripVertical, X, Sparkles, Wand2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { initAudioContext } from "@/lib/audio";
import { soundboardStore, type SoundboardSlot } from "@/lib/db";

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const data = buffer.getChannelData(0);
  const samples = data.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  const ab = new ArrayBuffer(bufferSize);
  const view = new DataView(ab);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true); writeStr(36, 'data'); view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return new Blob([ab], { type: 'audio/wav' });
}

interface SoundByte {
  id: string;
  name: string;
  category: string;
  audioData: string;
  color: string;
}

const CATEGORIES = ["Drops", "FX", "Vocals", "Bass", "Drums", "Custom"];

const CATEGORY_COLORS: Record<string, string> = {
  Drops: "from-cyan-500/70 to-blue-600/50",
  FX: "from-fuchsia-500/70 to-purple-600/50",
  Vocals: "from-amber-500/70 to-orange-600/50",
  Bass: "from-emerald-500/70 to-green-600/50",
  Drums: "from-rose-500/70 to-red-600/50",
  Custom: "from-violet-500/70 to-indigo-600/50",
};

const CATEGORY_GLOWS: Record<string, string> = {
  Drops: "rgba(0,255,255,0.4)",
  FX: "rgba(255,0,200,0.4)",
  Vocals: "rgba(245,158,11,0.4)",
  Bass: "rgba(16,185,129,0.4)",
  Drums: "rgba(244,63,94,0.4)",
  Custom: "rgba(139,92,246,0.4)",
};

const DEFAULT_SOUNDS: SoundByte[] = [
  { id: "air-horn", name: "Air Horn", category: "Drops", audioData: "builtin:airhorn", color: CATEGORY_COLORS.Drops },
  { id: "bass-drop", name: "Bass Drop", category: "Drops", audioData: "builtin:bassdrop", color: CATEGORY_COLORS.Drops },
  { id: "riser", name: "Riser", category: "FX", audioData: "builtin:riser", color: CATEGORY_COLORS.FX },
  { id: "laser", name: "Laser", category: "FX", audioData: "builtin:laser", color: CATEGORY_COLORS.FX },
  { id: "scratch", name: "Scratch", category: "FX", audioData: "builtin:scratch", color: CATEGORY_COLORS.FX },
  { id: "yeah", name: "Yeah!", category: "Vocals", audioData: "builtin:yeah", color: CATEGORY_COLORS.Vocals },
  { id: "lets-go", name: "Let's Go!", category: "Vocals", audioData: "builtin:letsgo", color: CATEGORY_COLORS.Vocals },
  { id: "kick-808", name: "808 Kick", category: "Drums", audioData: "builtin:kick808", color: CATEGORY_COLORS.Drums },
  { id: "clap", name: "Clap", category: "Drums", audioData: "builtin:clap", color: CATEGORY_COLORS.Drums },
  { id: "hi-hat", name: "Hi-Hat", category: "Drums", audioData: "builtin:hihat", color: CATEGORY_COLORS.Drums },
  { id: "snare", name: "Snare", category: "Drums", audioData: "builtin:snare", color: CATEGORY_COLORS.Drums },
  { id: "sub-bass", name: "Sub Bass", category: "Bass", audioData: "builtin:subbass", color: CATEGORY_COLORS.Bass },
];

function generateBuiltinSound(type: string, audioCtx: AudioContext): void {
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  switch (type) {
    case "airhorn":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
      osc.frequency.linearRampToValueAtTime(900, now + 0.5);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    case "bassdrop":
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
    case "riser":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(4000, now + 1.5);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.5);
      osc.start(now);
      osc.stop(now + 1.5);
      break;
    case "laser":
      osc.type = "sine";
      osc.frequency.setValueAtTime(3000, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
      break;
    case "scratch":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(2000, now + 0.05);
      osc.frequency.linearRampToValueAtTime(300, now + 0.15);
      osc.frequency.linearRampToValueAtTime(1500, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    case "yeah":
    case "letsgo": {
      const formant1 = audioCtx.createOscillator();
      const formant2 = audioCtx.createOscillator();
      const g1 = audioCtx.createGain();
      const g2 = audioCtx.createGain();
      formant1.connect(g1);
      formant2.connect(g2);
      g1.connect(audioCtx.destination);
      g2.connect(audioCtx.destination);
      formant1.type = "sawtooth";
      formant2.type = "square";
      formant1.frequency.setValueAtTime(type === "yeah" ? 600 : 400, now);
      formant1.frequency.linearRampToValueAtTime(type === "yeah" ? 800 : 600, now + 0.2);
      formant2.frequency.setValueAtTime(type === "yeah" ? 1200 : 900, now);
      g1.gain.setValueAtTime(0.15, now);
      g1.gain.linearRampToValueAtTime(0, now + 0.4);
      g2.gain.setValueAtTime(0.08, now);
      g2.gain.linearRampToValueAtTime(0, now + 0.35);
      formant1.start(now);
      formant1.stop(now + 0.4);
      formant2.start(now);
      formant2.stop(now + 0.35);
      gain.disconnect();
      osc.disconnect();
      return;
    }
    case "kick808":
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    case "clap": {
      const bufSize = audioCtx.sampleRate * 0.15;
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.03));
      }
      const src = audioCtx.createBufferSource();
      const filter = audioCtx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2000;
      filter.Q.value = 1.5;
      src.buffer = buf;
      const cGain = audioCtx.createGain();
      cGain.gain.setValueAtTime(0.5, now);
      src.connect(filter);
      filter.connect(cGain);
      cGain.connect(audioCtx.destination);
      src.start(now);
      gain.disconnect();
      osc.disconnect();
      return;
    }
    case "hihat": {
      const bufSize2 = audioCtx.sampleRate * 0.05;
      const buf2 = audioCtx.createBuffer(1, bufSize2, audioCtx.sampleRate);
      const data2 = buf2.getChannelData(0);
      for (let i = 0; i < bufSize2; i++) {
        data2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.008));
      }
      const src2 = audioCtx.createBufferSource();
      const hpf = audioCtx.createBiquadFilter();
      hpf.type = "highpass";
      hpf.frequency.value = 8000;
      src2.buffer = buf2;
      const hGain = audioCtx.createGain();
      hGain.gain.setValueAtTime(0.25, now);
      src2.connect(hpf);
      hpf.connect(hGain);
      hGain.connect(audioCtx.destination);
      src2.start(now);
      gain.disconnect();
      osc.disconnect();
      return;
    }
    case "snare": {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      const nBufSize = audioCtx.sampleRate * 0.1;
      const nBuf = audioCtx.createBuffer(1, nBufSize, audioCtx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nBufSize; i++) {
        nData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.02));
      }
      const nSrc = audioCtx.createBufferSource();
      nSrc.buffer = nBuf;
      const nGain = audioCtx.createGain();
      nGain.gain.setValueAtTime(0.3, now);
      nSrc.connect(nGain);
      nGain.connect(audioCtx.destination);
      nSrc.start(now);
      break;
    }
    case "subbass":
      osc.type = "sine";
      osc.frequency.setValueAtTime(45, now);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
      break;
    default:
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
  }
}

interface SoundboardProps {
  compact?: boolean;
}

// --- Local-first persistence (Phase 1) ---
// Custom + AI sounds are stored in IndexedDB (offline-capable, via the universal
// slot model) with localStorage as an instant-load fallback / old-browser shim.

const LS_KEY = "soundboard-custom-sounds";

function toSlot(sound: SoundByte): SoundboardSlot {
  return {
    id: sound.id,
    name: sound.name,
    category: sound.category,
    color: sound.color,
    audioData: sound.audioData,
    source: sound.audioData.startsWith("builtin:")
      ? "builtin"
      : sound.id.startsWith("ai-")
        ? "ai"
        : "custom",
    createdAt: Date.now(),
  };
}

function fromSlot(slot: SoundboardSlot): SoundByte {
  return {
    id: slot.id,
    name: slot.name,
    category: slot.category,
    audioData: slot.audioData,
    color: slot.color,
  };
}

function persistCustomSounds(customs: SoundByte[]): void {
  // IndexedDB is the source of truth for offline resilience.
  soundboardStore.saveAll(customs.map(toSlot)).catch(() => {
    /* non-fatal — falls back to localStorage below */
  });
  // localStorage: instant synchronous read on next boot + old-browser fallback.
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(customs));
  } catch {
    /* storage may be full (large data URLs) — IndexedDB still covers us */
  }
}

export default function Soundboard({ compact = false }: SoundboardProps) {
  const { toast } = useToast();
  const [sounds, setSounds] = useState<SoundByte[]>(() => {
    const saved = localStorage.getItem("soundboard-custom-sounds");
    const customs: SoundByte[] = saved ? JSON.parse(saved) : [];
    return [...DEFAULT_SOUNDS, ...customs];
  });
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activePad, setActivePad] = useState<string | null>(null);
  const [sbVolume, setSbVolume] = useState(0.8);
  const [showUpload, setShowUpload] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [newSoundName, setNewSoundName] = useState("");
  const [newSoundCategory, setNewSoundCategory] = useState("Custom");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Reconcile with IndexedDB on mount (local-first: IndexedDB is authoritative,
  // localStorage is the instant-load fallback / old-browser shim).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const slots = await soundboardStore.load();
        if (cancelled) return;
        if (slots.length > 0) {
          // IndexedDB has saved customs — use them, keep built-ins.
          const customs = slots.map(fromSlot);
          setSounds((prev) => {
            const builtin = prev.filter((s) => s.audioData.startsWith("builtin:"));
            return [...builtin, ...customs];
          });
        } else {
          // IndexedDB empty — migrate any localStorage customs into IndexedDB.
          const saved = localStorage.getItem(LS_KEY);
          if (saved) {
            const customs: SoundByte[] = JSON.parse(saved);
            if (customs.length) {
              await soundboardStore.saveAll(customs.map(toSlot));
            }
          }
        }
      } catch {
        /* IndexedDB unavailable — stay on localStorage */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback((sound: SoundByte) => {
    initAudioContext();
    setActivePad(sound.id);
    setTimeout(() => setActivePad(null), 300);

    if (sound.audioData.startsWith("builtin:")) {
      const type = sound.audioData.replace("builtin:", "");
      const ctx = getAudioContext();
      generateBuiltinSound(type, ctx);
    } else {
      const audio = new Audio(sound.audioData);
      audio.volume = sbVolume;
      audio.play().catch(console.error);
    }
  }, [sbVolume, getAudioContext]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast({ title: "Invalid file", description: "Please upload an audio file", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const newSound: SoundByte = {
        id: `custom-${Date.now()}`,
        name: newSoundName || file.name.replace(/\.[^.]+$/, ""),
        category: newSoundCategory,
        audioData: dataUrl,
        color: CATEGORY_COLORS[newSoundCategory] || CATEGORY_COLORS.Custom,
      };
      const updated = [...sounds, newSound];
      setSounds(updated);
      persistCustomSounds(updated.filter(s => !s.audioData.startsWith("builtin:")));
      setShowUpload(false);
      setNewSoundName("");
      toast({ title: "Sound added!", description: `"${newSound.name}" added to ${newSoundCategory}` });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSound = (id: string) => {
    const updated = sounds.filter(s => s.id !== id);
    setSounds(updated);
    persistCustomSounds(updated.filter(s => !s.audioData.startsWith("builtin:")));
  };

  const generateAISound = useCallback(async () => {
    if (!generatePrompt.trim()) return;
    setIsGenerating(true);
    try {
      const ctx = getAudioContext();
      const duration = 1.5;
      const sampleRate = ctx.sampleRate;
      const frames = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, frames, sampleRate);
      const data = buffer.getChannelData(0);
      const prompt = generatePrompt.toLowerCase();

      const hasKick = prompt.includes("kick") || prompt.includes("thump") || prompt.includes("boom");
      const hasSnare = prompt.includes("snare") || prompt.includes("crack") || prompt.includes("snap");
      const hasHiHat = prompt.includes("hat") || prompt.includes("tick") || prompt.includes("click");
      const hasBass = prompt.includes("bass") || prompt.includes("sub") || prompt.includes("rumble");
      const hasRiser = prompt.includes("riser") || prompt.includes("sweep") || prompt.includes("build");
      const hasLaser = prompt.includes("laser") || prompt.includes("zap") || prompt.includes("pew");
      const hasChord = prompt.includes("chord") || prompt.includes("pad") || prompt.includes("ambient");
      const hasWobble = prompt.includes("wobble") || prompt.includes("wub") || prompt.includes("dubstep");

      for (let i = 0; i < frames; i++) {
        const t = i / sampleRate;
        let sample = 0;
        const env = Math.exp(-t * 3);

        if (hasKick) {
          const kFreq = 150 * Math.exp(-t * 30);
          sample += Math.sin(2 * Math.PI * kFreq * t) * Math.exp(-t * 8) * 0.7;
        }
        if (hasSnare) {
          sample += (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.4;
          sample += Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 20) * 0.3;
        }
        if (hasHiHat) {
          sample += (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.2;
        }
        if (hasBass) {
          sample += Math.sin(2 * Math.PI * 55 * t) * env * 0.6;
          sample += Math.sin(2 * Math.PI * 110 * t) * env * 0.2;
        }
        if (hasRiser) {
          const rFreq = 200 + t * 3000;
          sample += Math.sin(2 * Math.PI * rFreq * t) * Math.min(t * 2, 1) * 0.4;
        }
        if (hasLaser) {
          const lFreq = 2000 * Math.exp(-t * 8);
          sample += Math.sin(2 * Math.PI * lFreq * t) * Math.exp(-t * 5) * 0.5;
        }
        if (hasChord) {
          [261.6, 329.6, 392.0, 523.3].forEach(f => {
            sample += Math.sin(2 * Math.PI * f * t) * env * 0.15;
          });
        }
        if (hasWobble) {
          const wobRate = 4 + Math.sin(t * 2) * 3;
          sample += Math.sin(2 * Math.PI * 80 * t + Math.sin(wobRate * t * 2 * Math.PI) * 3) * env * 0.5;
        }
        if (!hasKick && !hasSnare && !hasHiHat && !hasBass && !hasRiser && !hasLaser && !hasChord && !hasWobble) {
          const baseFreq = 220 + (prompt.charCodeAt(0) || 0) * 3;
          sample += Math.sin(2 * Math.PI * baseFreq * t) * env * 0.4;
          sample += Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * env * 0.2;
          sample += (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.1;
        }

        data[i] = Math.max(-1, Math.min(1, sample));
      }

      const offlineCtx = new OfflineAudioContext(1, frames, sampleRate);
      const src = offlineCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(offlineCtx.destination);
      src.start();
      const rendered = await offlineCtx.startRendering();

      const wavBlob = audioBufferToWav(rendered);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const category = hasKick || hasSnare || hasHiHat ? "Drums" : hasBass || hasWobble ? "Bass" : hasRiser || hasLaser ? "FX" : hasChord ? "Custom" : "FX";
        const newSound: SoundByte = {
          id: `ai-${Date.now()}`,
          name: generatePrompt.slice(0, 20),
          category,
          audioData: dataUrl,
          color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Custom,
        };
        const updated = [...sounds, newSound];
        setSounds(updated);
        persistCustomSounds(updated.filter(s => !s.audioData.startsWith("builtin:")));
        setGeneratePrompt("");
        setShowGenerate(false);
        toast({ title: "AI Sound Generated!", description: `"${newSound.name}" created and added to ${category}` });
      };
      reader.readAsDataURL(wavBlob);
    } catch (err) {
      toast({ title: "Generation failed", description: "Could not generate sound", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }, [generatePrompt, sounds, getAudioContext, toast]);

  const filtered = activeCategory === "All" ? sounds : sounds.filter(s => s.category === activeCategory);

  return (
    <div className={`flex flex-col h-full ${compact ? 'p-2' : 'p-4'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold neon-text-magenta uppercase tracking-wider">Soundboard</h3>
        <div className="flex items-center gap-2">
          <Volume2 className="w-3 h-3 text-white/40" />
          <Slider
            value={[sbVolume * 100]}
            max={100}
            step={1}
            onValueChange={([v]) => setSbVolume(v / 100)}
            className="w-16"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-fuchsia-400 hover:text-fuchsia-300"
            onClick={() => { setShowGenerate(!showGenerate); setShowUpload(false); }}
            title="AI Generate Sound"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300"
            onClick={() => { setShowUpload(!showUpload); setShowGenerate(false); }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-thin pb-1">
        {["All", ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all
              ${activeCategory === cat
                ? "bg-cyan-500/20 text-cyan-300 neon-border"
                : "text-white/40 hover:text-white/60 border border-transparent"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="glass-panel rounded-lg p-3 space-y-2">
              <Input
                placeholder="Sound name"
                value={newSoundName}
                onChange={(e) => setNewSoundName(e.target.value)}
                className="h-7 text-xs bg-white/5 border-white/10"
              />
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setNewSoundCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all
                      ${newSoundCategory === cat ? "bg-cyan-500/30 text-cyan-300" : "text-white/40 hover:text-white/60"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full h-7 text-xs bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                Choose Audio File
              </Button>
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGenerate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="glass-panel rounded-lg p-3 space-y-2 neon-border-magenta">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="text-[10px] font-semibold text-fuchsia-300 uppercase tracking-wider">AI Sound Generator</span>
              </div>
              <Input
                placeholder='Describe a sound... e.g. "deep kick with sub bass"'
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                className="h-7 text-xs bg-white/5 border-white/10"
                onKeyDown={(e) => e.key === "Enter" && generateAISound()}
              />
              <div className="flex flex-wrap gap-1">
                {["kick + bass", "laser zap", "riser sweep", "ambient chord", "wobble bass", "snare crack", "hi-hat tick"].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setGeneratePrompt(preset)}
                    className="px-1.5 py-0.5 rounded text-[9px] text-white/50 hover:text-fuchsia-300 bg-white/5 hover:bg-fuchsia-500/10 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full h-7 text-xs bg-fuchsia-600/30 hover:bg-fuchsia-600/50 text-fuchsia-300"
                onClick={generateAISound}
                disabled={isGenerating || !generatePrompt.trim()}
              >
                {isGenerating ? (
                  <><Wand2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-3 h-3 mr-1" /> Generate Sound</>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`grid ${compact ? 'grid-cols-3 gap-1.5' : 'grid-cols-4 gap-2'} flex-1 overflow-y-auto scrollbar-thin`}>
        {filtered.map(sound => {
          const gradient = CATEGORY_COLORS[sound.category] || CATEGORY_COLORS.Custom;
          const glow = CATEGORY_GLOWS[sound.category] || CATEGORY_GLOWS.Custom;
          const isActive = activePad === sound.id;
          const isCustom = !sound.audioData.startsWith("builtin:");

          return (
            <motion.button
              key={sound.id}
              className={`relative rounded-lg bg-gradient-to-br ${gradient} border border-white/10 
                flex flex-col items-center justify-center text-center p-1.5
                hover:brightness-125 transition-all cursor-pointer select-none group`}
              style={{
                boxShadow: isActive ? `0 0 15px ${glow}, inset 0 0 10px ${glow}` : `0 0 4px ${glow.replace('0.4', '0.1')}`,
                aspectRatio: compact ? '1' : '1.1',
              }}
              whileTap={{ scale: 0.9 }}
              onClick={() => playSound(sound)}
            >
              <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-semibold text-white/90 leading-tight`}>
                {sound.name}
              </span>
              <span className="text-[8px] text-white/40 mt-0.5">{sound.category}</span>
              {isCustom && (
                <button
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded bg-black/40"
                  onClick={(e) => { e.stopPropagation(); removeSound(sound.id); }}
                >
                  <X className="w-2.5 h-2.5 text-red-400" />
                </button>
              )}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
