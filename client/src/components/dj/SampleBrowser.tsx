import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Play,
  Pause,
  Upload,
  Music,
  Drum,
  Mic2,
  Zap,
  Hash,
  MoreHorizontal,
  Search,
  GripVertical,
  ChevronDown,
  X,
} from "lucide-react";
import { type PadSampler, type PadSample, type PadCategory } from "@/lib/padSampler";
import { type TrackLibrary, type LibraryTrack, type SortField, type SortDirection } from "@/lib/trackLibrary";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SampleBrowserProps {
  sampler: PadSampler;
  library: TrackLibrary;
  activeBank: number;
  onSampleLoad?: (buffer: AudioBuffer, name: string) => void;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

interface CategoryInfo {
  key: PadCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
  keywords: string[];
}

const CATEGORIES: CategoryInfo[] = [
  {
    key: "kick",
    label: "Drums",
    icon: <Drum className="w-3.5 h-3.5" />,
    color: "#f43f5e",
    keywords: ["kick", "snare", "hat", "clap", "perc", "drum", "808", "909", "tom", "crash", "ride", "rim", "rimshot"],
  },
  {
    key: "bass",
    label: "Bass",
    icon: <Music className="w-3.5 h-3.5" />,
    color: "#a855f7",
    keywords: ["bass", "sub", "808", "reese", "wobble"],
  },
  {
    key: "fx",
    label: "FX",
    icon: <Zap className="w-3.5 h-3.5" />,
    color: "#f59e0b",
    keywords: ["fx", "sweep", "riser", "impact", "whoosh", "noise", "reverse", "glitch", "stutter", "siren", "laser"],
  },
  {
    key: "vocal",
    label: "Vocals",
    icon: <Mic2 className="w-3.5 h-3.5" />,
    color: "#22d3ee",
    keywords: ["vocal", "vox", "voice", "chop", "talk", "sing", "choir", "adlib"],
  },
  {
    key: "chord",
    label: "Melodic",
    icon: <Music className="w-3.5 h-3.5" />,
    color: "#10b981",
    keywords: ["chord", "pad", "lead", "pluck", "keys", "piano", "guitar", "synth", "melody", "arp", "bell"],
  },
  {
    key: "other",
    label: "Other",
    icon: <MoreHorizontal className="w-3.5 h-3.5" />,
    color: "#6366f1",
    keywords: [],
  },
];

function getCategoryIcon(category: PadCategory): React.ReactNode {
  const info = CATEGORIES.find((c) => c.key === category);
  return info?.icon ?? <MoreHorizontal className="w-3.5 h-3.5" />;
}

function getCategoryColor(category: PadCategory): string {
  const info = CATEGORIES.find((c) => c.key === category);
  return info?.color ?? "#6366f1";
}

function autoCategorize(filename: string): PadCategory {
  const lower = filename.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.key === "other") continue;
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return cat.key;
    }
  }
  return "other";
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Loaded sample entry (from sampler banks)
// ---------------------------------------------------------------------------

interface LoadedSampleEntry {
  bank: number;
  slot: number;
  pad: PadSample;
}

function getLoadedSamples(sampler: PadSampler): LoadedSampleEntry[] {
  const entries: LoadedSampleEntry[] = [];
  const banks = sampler.getAllBanks();
  for (let b = 0; b < banks.length; b++) {
    for (let s = 0; s < banks[b].pads.length; s++) {
      const pad = banks[b].pads[s];
      if (pad && pad.audioBuffer) {
        entries.push({ bank: b, slot: s, pad });
      }
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SampleBrowser({
  sampler,
  library,
  activeBank,
  onSampleLoad,
  compact = false,
}: SampleBrowserProps) {
  // -- state --
  const [tab, setTab] = useState<"loaded" | "library" | "import">("loaded");
  const [loadedSamples, setLoadedSamples] = useState<LoadedSampleEntry[]>([]);
  const [libraryTracks, setLibraryTracks] = useState<LibraryTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("dateAdded");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [categoryFilter, setCategoryFilter] = useState<PadCategory | "all">("all");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    buffer: AudioBuffer;
    name: string;
  } | null>(null);
  const [assignBank, setAssignBank] = useState(activeBank);
  const [assignSlot, setAssignSlot] = useState(0);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [importFiles, setImportFiles] = useState<
    { file: File; name: string; category: PadCategory; status: "pending" | "loading" | "done" | "error" }[]
  >([]);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- refresh loaded samples periodically --
  const refreshLoaded = useCallback(() => {
    setLoadedSamples(getLoadedSamples(sampler));
  }, [sampler]);

  useEffect(() => {
    refreshLoaded();
    // Poll for changes (sampler doesn't have an event system)
    refreshTimerRef.current = setInterval(refreshLoaded, 1000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [refreshLoaded]);

  // -- load library tracks --
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const tracks = await library.getAllTracks();
        if (!cancelled) setLibraryTracks(tracks);
      } catch (err) {
        console.error("Failed to load library:", err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [library]);

  // -- filter + sort library --
  const filteredLibrary = useMemo(() => {
    let result = libraryTracks;

    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // sort
    const sorted = [...result].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv);
      if (typeof av === "number" && typeof bv === "number") return av - bv;
      return 0;
    });

    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [libraryTracks, searchQuery, sortField, sortDirection]);

  // -- filter loaded by category --
  const filteredLoaded = useMemo(() => {
    if (categoryFilter === "all") return loadedSamples;
    return loadedSamples.filter((e) => e.pad.category === categoryFilter);
  }, [loadedSamples, categoryFilter]);

  // -- preview playback --
  const playPreview = useCallback((buffer: AudioBuffer, id: string) => {
    // stop any current preview
    stopPreview();

    const ctx = previewCtxRef.current ?? new AudioContext();
    previewCtxRef.current = ctx;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    previewSourceRef.current = source;
    setPreviewingId(id);

    source.onended = () => {
      if (previewSourceRef.current === source) {
        setPreviewingId(null);
        previewSourceRef.current = null;
      }
    };
  }, []);

  const stopPreview = useCallback(() => {
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
      } catch {
        // already stopped
      }
      previewSourceRef.current = null;
    }
    setPreviewingId(null);
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopPreview();
      if (previewCtxRef.current) {
        previewCtxRef.current.close();
        previewCtxRef.current = null;
      }
    };
  }, [stopPreview]);

  // -- preview library track via Audio element --
  const previewLibraryTrack = useCallback(
    async (track: LibraryTrack) => {
      if (previewingId === track.id) {
        stopPreview();
        return;
      }
      stopPreview();

      try {
        const url = URL.createObjectURL(track.audioBlob);
        const audio = new Audio(url);
        audio.onended = () => {
          setPreviewingId(null);
          URL.revokeObjectURL(url);
        };
        await audio.play();
        previewAudioRef.current = audio;
        setPreviewingId(track.id);
      } catch (err) {
        console.error("Preview failed:", err);
      }
    },
    [previewingId, stopPreview]
  );

  // -- assign to pad --
  const openAssignDialog = useCallback((buffer: AudioBuffer, name: string) => {
    setAssignTarget({ buffer, name });
    setAssignBank(activeBank);
    setAssignSlot(0);
    setAssignDialogOpen(true);
  }, [activeBank]);

  const confirmAssign = useCallback(() => {
    if (!assignTarget) return;
    sampler.loadSampleFromBuffer(assignTarget.buffer, assignSlot, assignBank);
    const pad = sampler.getPad(assignSlot, assignBank);
    if (pad) {
      pad.name = assignTarget.name;
      pad.category = autoCategorize(assignTarget.name);
    }
    refreshLoaded();
    setAssignDialogOpen(false);
    setAssignTarget(null);
    if (onSampleLoad) {
      onSampleLoad(assignTarget.buffer, assignTarget.name);
    }
  }, [assignTarget, assignSlot, assignBank, sampler, refreshLoaded, onSampleLoad]);

  // -- drag from loaded sample --
  const handleLoadedDragStart = useCallback(
    (e: React.DragEvent, entry: LoadedSampleEntry) => {
      if (!entry.pad.audioBuffer) return;
      e.dataTransfer.setData(
        "application/x-dj-sample",
        JSON.stringify({
          type: "loaded",
          bank: entry.bank,
          slot: entry.slot,
          name: entry.pad.name,
        })
      );
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  // -- drag from library track --
  const handleLibraryDragStart = useCallback((e: React.DragEvent, track: LibraryTrack) => {
    e.dataTransfer.setData(
      "application/x-dj-sample",
      JSON.stringify({
        type: "library",
        trackId: track.id,
        name: track.title,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  // -- import files --
  const handleImportFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const entries = fileArray.map((f) => ({
        file: f,
        name: f.name.replace(/\.[^/.]+$/, ""),
        category: autoCategorize(f.name),
        status: "pending" as const,
      }));
      setImportFiles(entries);

      // decode and store each
      const ctx = new AudioContext();
      for (let i = 0; i < entries.length; i++) {
        setImportFiles((prev) =>
          prev.map((e, idx) => (idx === i ? { ...e, status: "loading" } : e))
        );
        try {
          const arrayBuf = await entries[i].file.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arrayBuf);

          // add to library
          const blob = entries[i].file;
          await library.addTrack({
            title: entries[i].name,
            artist: "Unknown",
            bpm: 0,
            key: "",
            camelotKey: "",
            duration: buffer.duration,
            genre: "",
            tags: [entries[i].category],
            dateAdded: Date.now(),
            lastPlayed: 0,
            playCount: 0,
            isFavorite: false,
            playlistIds: [],
            audioBlob: blob,
            waveformData: [],
            energy: 0,
          });

          setImportFiles((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, status: "done" } : e))
          );

          if (onSampleLoad) {
            onSampleLoad(buffer, entries[i].name);
          }
        } catch (err) {
          console.error("Import failed for", entries[i].name, err);
          setImportFiles((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, status: "error" } : e))
          );
        }
      }
      ctx.close();

      // refresh library
      try {
        const tracks = await library.getAllTracks();
        setLibraryTracks(tracks);
      } catch {
        // ignore
      }
    },
    [library, onSampleLoad]
  );

  // -- drop zone --
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverTarget(null);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleImportFiles(files);
      }
    },
    [handleImportFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverTarget("import");
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  // -- file picker --
  const handleFilePicker = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleImportFiles(files);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleImportFiles]
  );

  // -- render --
  const itemHeight = compact ? "py-1.5" : "py-2";

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-800/50">
        <Music className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-gray-200">Sample Browser</span>
        <span className="text-xs text-gray-500 ml-auto">
          {loadedSamples.length} loaded
        </span>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-2 mt-2 bg-gray-800 border border-gray-700">
          <TabsTrigger
            value="loaded"
            className="flex-1 text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300"
          >
            Loaded ({loadedSamples.length})
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="flex-1 text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300"
          >
            Library ({libraryTracks.length})
          </TabsTrigger>
          <TabsTrigger
            value="import"
            className="flex-1 text-xs data-[state=active]:bg-cyan-600/20 data-[state=active]:text-cyan-300"
          >
            Import
          </TabsTrigger>
        </TabsList>

        {/* === LOADED TAB === */}
        <TabsContent value="loaded" className="flex-1 min-h-0 mt-2 px-2 pb-2 flex flex-col">
          {/* Category filter */}
          <div className="flex gap-1 mb-2 flex-wrap">
            <Button
              size="sm"
              variant={categoryFilter === "all" ? "default" : "outline"}
              className={`h-6 px-2 text-[10px] ${
                categoryFilter === "all"
                  ? "bg-cyan-600 text-white"
                  : "border-gray-700 text-gray-400 hover:text-cyan-400"
              }`}
              onClick={() => setCategoryFilter("all")}
            >
              All
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.key}
                size="sm"
                variant={categoryFilter === cat.key ? "default" : "outline"}
                className={`h-6 px-2 text-[10px] gap-1 ${
                  categoryFilter === cat.key
                    ? "bg-cyan-600 text-white"
                    : "border-gray-700 text-gray-400 hover:text-cyan-400"
                }`}
                onClick={() => setCategoryFilter(cat.key)}
              >
                {cat.icon}
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Sample list */}
          <ScrollArea className="flex-1">
            {filteredLoaded.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Music className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">No samples loaded{categoryFilter !== "all" ? " in this category" : ""}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filteredLoaded.map((entry) => {
                  const id = `loaded-${entry.bank}-${entry.slot}`;
                  const isPreviewing = previewingId === id;
                  const color = getCategoryColor(entry.pad.category);

                  return (
                    <motion.div
                      key={id}
                      className={`flex items-center gap-2 ${itemHeight} px-2 rounded-md
                        bg-gray-800/40 hover:bg-gray-800 border border-transparent hover:border-gray-700
                        cursor-grab active:cursor-grabbing group`}
                      draggable
                      onDragStart={(e) => handleLoadedDragStart(e as any, entry)}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "tween", duration: 0.1 }}
                    >
                      {/* Drag handle */}
                      <GripVertical className="w-3 h-3 text-gray-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Category icon */}
                      <div className="shrink-0" style={{ color }}>
                        {getCategoryIcon(entry.pad.category)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-200 truncate">
                          {entry.pad.name}
                        </div>
                        <div className="text-[10px] text-gray-500 flex gap-2">
                          <span>B{entry.bank + 1}:P{entry.slot + 1}</span>
                          <span>{formatDuration(entry.pad.audioBuffer?.duration ?? 0)}</span>
                        </div>
                      </div>

                      {/* Play/preview */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-6 w-6 p-0 shrink-0 ${
                          isPreviewing
                            ? "text-cyan-400 hover:text-cyan-300"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                        onClick={() => {
                          if (isPreviewing) {
                            stopPreview();
                          } else if (entry.pad.audioBuffer) {
                            playPreview(entry.pad.audioBuffer, id);
                          }
                        }}
                      >
                        {isPreviewing ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </Button>

                      {/* Assign */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px] text-gray-500 hover:text-cyan-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          if (entry.pad.audioBuffer) {
                            openAssignDialog(entry.pad.audioBuffer, entry.pad.name);
                          }
                        }}
                      >
                        Assign
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* === LIBRARY TAB === */}
        <TabsContent value="library" className="flex-1 min-h-0 mt-2 px-2 pb-2 flex flex-col">
          {/* Search + Sort */}
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks..."
                className="h-7 pl-7 text-xs bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[100px] h-7 text-xs border-gray-700 bg-gray-800 text-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="title" className="text-xs">Name</SelectItem>
                <SelectItem value="bpm" className="text-xs">BPM</SelectItem>
                <SelectItem value="key" className="text-xs">Key</SelectItem>
                <SelectItem value="dateAdded" className="text-xs">Date Added</SelectItem>
                <SelectItem value="playCount" className="text-xs">Play Count</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-gray-700 text-gray-400 hover:text-cyan-400"
              onClick={() =>
                setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
              }
            >
              {sortDirection === "asc" ? "A-Z" : "Z-A"}
            </Button>
          </div>

          {/* Track list */}
          <ScrollArea className="flex-1">
            {filteredLibrary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Music className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">
                  {searchQuery ? "No matching tracks" : "Library is empty. Import some tracks!"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {filteredLibrary.map((track) => {
                  const id = `lib-${track.id}`;
                  const isPreviewing = previewingId === track.id;

                  return (
                    <motion.div
                      key={track.id}
                      className={`flex items-center gap-2 ${itemHeight} px-2 rounded-md
                        bg-gray-800/40 hover:bg-gray-800 border border-transparent hover:border-gray-700
                        cursor-grab active:cursor-grabbing group`}
                      draggable
                      onDragStart={(e) => handleLibraryDragStart(e as any, track)}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "tween", duration: 0.1 }}
                    >
                      <GripVertical className="w-3 h-3 text-gray-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-200 truncate">
                          {track.title}
                        </div>
                        <div className="text-[10px] text-gray-500 flex gap-2 truncate">
                          <span>{track.artist}</span>
                          {track.bpm > 0 && <span>{track.bpm} BPM</span>}
                          {track.key && <span>{track.camelotKey || track.key}</span>}
                          <span>{formatDuration(track.duration)}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-6 w-6 p-0 shrink-0 ${
                          isPreviewing
                            ? "text-cyan-400 hover:text-cyan-300"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                        onClick={() => previewLibraryTrack(track)}
                      >
                        {isPreviewing ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px] text-gray-500 hover:text-cyan-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={async () => {
                          try {
                            const arrayBuf = await track.audioBlob.arrayBuffer();
                            const ctx = new AudioContext();
                            const buffer = await ctx.decodeAudioData(arrayBuf);
                            ctx.close();
                            openAssignDialog(buffer, track.title);
                          } catch (err) {
                            console.error("Failed to decode track:", err);
                          }
                        }}
                      >
                        Assign
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* === IMPORT TAB === */}
        <TabsContent value="import" className="flex-1 min-h-0 mt-2 px-2 pb-2 flex flex-col">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center
              transition-colors cursor-pointer mb-3
              ${
                dragOverTarget === "import"
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-gray-700 hover:border-gray-600 bg-gray-800/30"
              }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={handleFilePicker}
            />
            <Upload
              className={`w-8 h-8 mb-2 ${
                dragOverTarget === "import" ? "text-cyan-400" : "text-gray-500"
              }`}
            />
            <p className="text-xs text-gray-400 text-center">
              {dragOverTarget === "import"
                ? "Drop files here"
                : "Drag & drop audio files or click to browse"}
            </p>
            <p className="text-[10px] text-gray-600 mt-1">
              Supports WAV, MP3, OGG, FLAC, AAC
            </p>
          </div>

          {/* Import progress */}
          {importFiles.length > 0 && (
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-1">
                {importFiles.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-1.5 px-2 rounded bg-gray-800/40"
                  >
                    <div
                      className="shrink-0"
                      style={{ color: getCategoryColor(entry.category) }}
                    >
                      {getCategoryIcon(entry.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-200 truncate">
                        {entry.name}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {entry.category}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {entry.status === "pending" && (
                        <span className="text-[10px] text-gray-500">Pending</span>
                      )}
                      {entry.status === "loading" && (
                        <span className="text-[10px] text-cyan-400 animate-pulse">
                          Loading...
                        </span>
                      )}
                      {entry.status === "done" && (
                        <span className="text-[10px] text-emerald-400">Done</span>
                      )}
                      {entry.status === "error" && (
                        <span className="text-[10px] text-red-400">Error</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Assign to Pad Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 text-sm">
              Assign Sample to Pad
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <p className="text-xs text-gray-400 truncate">
              {assignTarget?.name}
            </p>

            {/* Bank selector */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-gray-500">Bank</Label>
              <div className="flex gap-1">
                {Array.from({ length: 8 }, (_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={assignBank === i ? "default" : "outline"}
                    className={`h-7 flex-1 text-xs ${
                      assignBank === i
                        ? "bg-cyan-600 text-white"
                        : "border-gray-700 text-gray-400 hover:text-cyan-400"
                    }`}
                    onClick={() => setAssignBank(i)}
                  >
                    B{i + 1}
                  </Button>
                ))}
              </div>
            </div>

            {/* Slot selector */}
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-gray-500">Slot</Label>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 16 }, (_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={assignSlot === i ? "default" : "outline"}
                    className={`h-7 text-xs ${
                      assignSlot === i
                        ? "bg-cyan-600 text-white"
                        : "border-gray-700 text-gray-400 hover:text-cyan-400"
                    }`}
                    onClick={() => setAssignSlot(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            </div>

            {/* Current pad info */}
            <div className="text-[10px] text-gray-500">
              {(() => {
                const current = sampler.getPad(assignSlot, assignBank);
                if (current?.audioBuffer) {
                  return `Replacing: ${current.name}`;
                }
                return `Target: Bank ${assignBank + 1}, Pad ${assignSlot + 1} (empty)`;
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-400"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
              onClick={confirmAssign}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
