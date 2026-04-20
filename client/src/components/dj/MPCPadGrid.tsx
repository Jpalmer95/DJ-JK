import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Volume2,
  Music,
  Settings,
  Trash2,
} from "lucide-react";
import { type PadSampler, type PadSample, type Subdivision } from "@/lib/padSampler";
import { generateKitBuffers, type KitName } from "@/lib/drumKits";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MPCPadGridProps {
  sampler: PadSampler;
  activeBank: number;
  onBankChange: (bank: number) => void;
  bpm: number;
  quantize: Subdivision;
  onQuantizeChange: (sub: Subdivision) => void;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEON_PALETTE = [
  "#00f0ff", // cyan
  "#ff00e5", // fuchsia
  "#a855f7", // violet
  "#22d3ee", // sky
  "#f43f5e", // rose
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#e879f9", // fuchsia-light
  "#facc15", // yellow
  "#8b5cf6", // purple
];

const SUBDIVISIONS: Subdivision[] = ["none", "1/4", "1/8", "1/16", "1/32"];

const KIT_NAMES: KitName[] = ["808", "909", "trap", "lofi"];

const BANK_COUNT = 8;
const PAD_COUNT = 16;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MPCPadGrid({
  sampler,
  activeBank,
  onBankChange,
  bpm,
  quantize,
  onQuantizeChange,
  compact = false,
}: MPCPadGridProps) {
  // -- local state --
  const [triggeredPads, setTriggeredPads] = useState<Set<number>>(new Set());
  const [editSlot, setEditSlot] = useState<number | null>(null);
  const [editPad, setEditPad] = useState<PadSample | null>(null);
  const [editVolume, setEditVolume] = useState(0.8);
  const [editPitch, setEditPitch] = useState(1.0);
  const [editAttack, setEditAttack] = useState(5);
  const [editDecay, setEditDecay] = useState(50);
  const [editName, setEditName] = useState("");
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [kitLoading, setKitLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // -- derive pads for current bank from sampler --
  const getBankPads = useCallback((): (PadSample | null)[] => {
    try {
      const bank = sampler.getBank(activeBank);
      return bank.pads;
    } catch {
      return new Array(PAD_COUNT).fill(null);
    }
  }, [sampler, activeBank]);

  const [pads, setPads] = useState<(PadSample | null)[]>(() => getBankPads());

  // re-read pads whenever bank or a trigger changes
  const refreshPads = useCallback(() => {
    setPads(getBankPads());
  }, [getBankPads]);

  useEffect(() => {
    refreshPads();
  }, [activeBank, refreshPads]);

  // sync master volume
  useEffect(() => {
    sampler.setMasterVolume(masterVolume);
  }, [masterVolume, sampler]);

  // -- trigger a pad --
  const handlePadTrigger = useCallback(
    (slot: number) => {
      sampler.triggerPadQuantized(slot, activeBank, bpm, quantize, 1.0);

      // visual feedback
      setTriggeredPads((prev) => {
        const next = new Set(prev);
        next.add(slot);
        return next;
      });

      // auto-clear glow after ~250ms
      const existing = triggerTimers.current.get(slot);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setTriggeredPads((prev) => {
          const next = new Set(prev);
          next.delete(slot);
          return next;
        });
        triggerTimers.current.delete(slot);
      }, 250);
      triggerTimers.current.set(slot, timer);
    },
    [sampler, activeBank, bpm, quantize],
  );

  // -- open edit dialog --
  const openEdit = useCallback(
    (slot: number) => {
      const pad = sampler.getPad(slot, activeBank);
      setEditSlot(slot);
      setEditPad(pad);
      if (pad) {
        setEditVolume(pad.volume);
        setEditPitch(pad.pitch);
        setEditAttack(pad.attack);
        setEditDecay(pad.decay);
        setEditName(pad.name);
      }
    },
    [sampler, activeBank],
  );

  const closeEdit = useCallback(() => {
    setEditSlot(null);
    setEditPad(null);
  }, []);

  // -- save edits --
  const saveEdits = useCallback(() => {
    if (editSlot === null) return;
    sampler.setPadVolume(editSlot, activeBank, editVolume);
    sampler.setPadPitch(editSlot, activeBank, editPitch);
    sampler.setPadAttack(editSlot, activeBank, editAttack);
    sampler.setPadDecay(editSlot, activeBank, editDecay);
    // update name directly on pad object
    const pad = sampler.getPad(editSlot, activeBank);
    if (pad) {
      pad.name = editName || `Pad ${editSlot + 1}`;
    }
    refreshPads();
    closeEdit();
  }, [editSlot, activeBank, editVolume, editPitch, editAttack, editDecay, editName, sampler, refreshPads, closeEdit]);

  // -- file upload --
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || editSlot === null) return;
      try {
        await sampler.loadSample(file, editSlot, activeBank);
        const pad = sampler.getPad(editSlot, activeBank);
        if (pad) {
          setEditName(pad.name);
          setEditPad(pad);
        }
        refreshPads();
      } catch (err) {
        console.error("Failed to load sample:", err);
      }
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [editSlot, activeBank, sampler, refreshPads],
  );

  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // -- clear pad --
  const clearPad = useCallback(() => {
    if (editSlot === null) return;
    const pad = sampler.getPad(editSlot, activeBank);
    if (pad) {
      pad.audioBuffer = null;
      pad.name = `Pad ${editSlot + 1}`;
    }
    refreshPads();
    closeEdit();
  }, [editSlot, activeBank, sampler, refreshPads, closeEdit]);

  // -- kit loader --
  const handleKitLoad = useCallback(
    async (kitName: KitName) => {
      setKitLoading(true);
      try {
        // Access audio context from sampler via a sample load trick
        // We create a temporary AudioContext for buffer generation
        const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffers = await generateKitBuffers(kitName, tempCtx);
        tempCtx.close();

        // Get audio context from the sampler's own context
        // We'll use the sampler's loadSampleFromBuffer with the generated buffers
        const keys = Object.keys(buffers);

        // Load up to 16 sounds into current bank
        const loadKeys = keys.slice(0, PAD_COUNT);
        for (let i = 0; i < loadKeys.length; i++) {
          const key = loadKeys[i];
          sampler.loadSampleFromBuffer(buffers[key], i, activeBank);
          const pad = sampler.getPad(i, activeBank);
          if (pad) {
            pad.name = key;
          }
        }

        // Clear remaining pads if kit has fewer than 16 sounds
        for (let i = loadKeys.length; i < PAD_COUNT; i++) {
          const pad = sampler.getPad(i, activeBank);
          if (pad) {
            pad.audioBuffer = null;
            pad.name = `Pad ${i + 1}`;
          }
        }

        refreshPads();
      } catch (err) {
        console.error("Failed to load kit:", err);
      } finally {
        setKitLoading(false);
      }
    },
    [sampler, activeBank, refreshPads],
  );

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of triggerTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  // -- pad size classes --
  const padMinH = compact ? "min-h-[60px]" : "min-h-[80px]";
  const padTextSize = compact ? "text-[10px]" : "text-xs";

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top toolbar: banks + kit loader + quantize */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Bank tabs */}
        <div className="flex gap-1">
          {Array.from({ length: BANK_COUNT }, (_, i) => (
            <Button
              key={i}
              size="sm"
              variant={activeBank === i ? "default" : "outline"}
              className={`h-7 px-2.5 text-xs font-mono ${
                activeBank === i
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                  : "border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-700"
              }`}
              onClick={() => {
                onBankChange(i);
                // Force refresh after bank change
                setTimeout(refreshPads, 0);
              }}
            >
              B{i + 1}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Kit loader */}
        <Select onValueChange={(v) => handleKitLoad(v as KitName)} disabled={kitLoading}>
          <SelectTrigger className="w-[120px] h-7 text-xs border-gray-700 bg-gray-800 text-gray-300">
            <SelectValue placeholder={kitLoading ? "Loading..." : "Kit"} />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {KIT_NAMES.map((kit) => (
              <SelectItem key={kit} value={kit} className="text-xs text-gray-300 focus:bg-gray-700 focus:text-white">
                {kit.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quantize selector */}
        <Select value={quantize} onValueChange={(v) => onQuantizeChange(v as Subdivision)}>
          <SelectTrigger className="w-[90px] h-7 text-xs border-gray-700 bg-gray-800 text-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            {SUBDIVISIONS.map((sub) => (
              <SelectItem key={sub} value={sub} className="text-xs text-gray-300 focus:bg-gray-700 focus:text-white">
                {sub === "none" ? "Free" : sub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4x4 Pad Grid */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: PAD_COUNT }, (_, slot) => {
          const pad = pads[slot] ?? null;
          const isLoaded = pad?.audioBuffer != null;
          const isActive = triggeredPads.has(slot);
          const color = NEON_PALETTE[slot % NEON_PALETTE.length];
          const label = pad?.name || `Pad ${slot + 1}`;
          const isEmpty = !isLoaded;

          return (
            <motion.button
              key={slot}
              className={`relative ${padMinH} rounded-lg border transition-all duration-75 cursor-pointer
                flex flex-col items-center justify-center gap-0.5 overflow-hidden
                ${isEmpty
                  ? "bg-gray-800/60 border-gray-700 text-gray-600"
                  : "bg-gray-900 border-gray-600"
                }
                ${isActive ? "" : "hover:brightness-125"}
              `}
              style={
                isActive
                  ? {
                      borderColor: color,
                      boxShadow: `0 0 20px ${color}88, 0 0 40px ${color}44, inset 0 0 15px ${color}22`,
                      backgroundColor: `${color}11`,
                    }
                  : isLoaded
                    ? {
                        borderColor: `${color}55`,
                        boxShadow: `0 0 6px ${color}22`,
                      }
                    : undefined
              }
              onMouseDown={(e) => {
                if (e.button === 0) handlePadTrigger(slot);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                openEdit(slot);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handlePadTrigger(slot);
              }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {/* Color indicator bar at top */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={{
                  backgroundColor: isEmpty ? "#374151" : color,
                  opacity: isActive ? 1 : 0.5,
                }}
              />

              {/* Active glow overlay */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{ backgroundColor: color, opacity: 0.12 }}
                    initial={{ opacity: 0.25 }}
                    animate={{ opacity: 0.12 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>

              {/* Pad content */}
              <Music
                className={`w-4 h-4 mb-0.5 ${isEmpty ? "text-gray-700" : ""}`}
                style={isLoaded ? { color } : undefined}
              />
              <span
                className={`${padTextSize} font-medium truncate max-w-full px-1 ${
                  isEmpty ? "text-gray-600" : "text-gray-300"
                }`}
              >
                {isEmpty ? "Empty" : label}
              </span>

              {/* Settings icon on hover */}
              <div
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(slot);
                }}
              >
                <Settings className="w-3 h-3 text-gray-500 hover:text-gray-300" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Master Volume */}
      <div className="flex items-center gap-3 px-1">
        <Volume2 className="w-4 h-4 text-gray-400 shrink-0" />
        <Label className="text-xs text-gray-500 shrink-0">Master</Label>
        <Slider
          value={[masterVolume * 100]}
          max={100}
          step={1}
          className="flex-1 [&_[role=slider]]:bg-cyan-500 [&_[role=slider]]:border-cyan-400 [&_[data-orientation]]:bg-gray-700"
          onValueChange={([v]) => setMasterVolume(v / 100)}
        />
        <span className="text-xs text-gray-500 font-mono w-8 text-right">
          {Math.round(masterVolume * 100)}%
        </span>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editSlot !== null} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              Edit Pad {(editSlot ?? 0) + 1}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editPad?.name || "No sample loaded"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Load / Clear buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-cyan-700 text-cyan-400 hover:bg-cyan-900/30"
                onClick={triggerFilePicker}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Load Sample
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-900/30"
                onClick={clearPad}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-400">Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm"
                placeholder="Pad name"
              />
            </div>

            {/* Volume */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs text-gray-400">Volume</Label>
                <span className="text-xs text-gray-500 font-mono">{Math.round(editVolume * 100)}%</span>
              </div>
              <Slider
                value={[editVolume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => setEditVolume(v / 100)}
                className="[&_[role=slider]]:bg-fuchsia-500 [&_[role=slider]]:border-fuchsia-400 [&_[data-orientation]]:bg-gray-700"
              />
            </div>

            {/* Pitch */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs text-gray-400">Pitch</Label>
                <span className="text-xs text-gray-500 font-mono">{editPitch.toFixed(2)}x</span>
              </div>
              <Slider
                value={[editPitch * 100]}
                min={50}
                max={200}
                step={1}
                onValueChange={([v]) => setEditPitch(v / 100)}
                className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-400 [&_[data-orientation]]:bg-gray-700"
              />
            </div>

            {/* Attack */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs text-gray-400">Attack</Label>
                <span className="text-xs text-gray-500 font-mono">{editAttack}ms</span>
              </div>
              <Slider
                value={[editAttack]}
                min={0}
                max={500}
                step={1}
                onValueChange={([v]) => setEditAttack(v)}
                className="[&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-400 [&_[data-orientation]]:bg-gray-700"
              />
            </div>

            {/* Decay */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs text-gray-400">Decay</Label>
                <span className="text-xs text-gray-500 font-mono">{editDecay}ms</span>
              </div>
              <Slider
                value={[editDecay]}
                min={0}
                max={2000}
                step={1}
                onValueChange={([v]) => setEditDecay(v)}
                className="[&_[role=slider]]:bg-amber-500 [&_[role=slider]]:border-amber-400 [&_[data-orientation]]:bg-gray-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-400 hover:text-gray-200"
              onClick={closeEdit}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
              onClick={saveEdits}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
