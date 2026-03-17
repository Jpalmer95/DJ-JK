import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { decodeRecording, RecordedSequence, playNote, startBeat, stopBeat } from "@/lib/audio";

export default function Share() {
  const [, params] = useRoute<{ id: string }>("/share/:id");
  const { toast } = useToast();
  const [recording, setRecording] = useState<RecordedSequence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume] = useState(0.8);

  useEffect(() => {
    if (!params?.id) return;
    const fetchRecording = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest<{ recording: string }>(`/api/share/${params.id}`);
        if (response && response.recording) {
          const decodedRecording = decodeRecording(response.recording);
          if (decodedRecording) setRecording(decodedRecording);
          else throw new Error("Invalid recording data");
        }
      } catch {
        toast({ title: "Failed to load recording", description: "This shared music piece couldn't be loaded.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecording();
  }, [params?.id, toast]);

  const playRecording = useCallback(() => {
    if (!recording || isPlaying) return;
    setIsPlaying(true);
    if (recording.beatPattern && recording.beatPattern !== "none") startBeat(recording.beatPattern, volume);
    recording.notes.forEach(note => {
      setTimeout(() => {
        const gridElement = document.querySelector(`[data-note-index="${note.noteIndex}"]`);
        if (gridElement) {
          gridElement.classList.add("played");
          setTimeout(() => gridElement.classList.remove("played"), 300);
          const noteName = gridElement.getAttribute("data-note") || "C4";
          playNote(noteName, volume, recording.soundMode);
        }
      }, note.time);
    });
    const lastNote = recording.notes.reduce((max, note) => (note.time > max.time ? note : max), recording.notes[0]);
    setTimeout(() => { setIsPlaying(false); stopBeat(); }, lastNote.time + 1500);
  }, [recording, volume, isPlaying]);

  const NOTES = ['C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5','C6','D6','E6','F6','G6','A6','B6'];

  return (
    <div className="min-h-screen w-full font-inter bg-dark-gradient bg-grid-pattern text-white">
      <header className="w-full py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold neon-text-cyan">Shared Music</h1>
          <Link href="/">
            <Button variant="outline" className="rounded-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/30">
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Studio
            </Button>
          </Link>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4" />
              <p className="text-white/50">Loading shared creation...</p>
            </div>
          ) : recording ? (
            <>
              <div className="mb-6 glass-panel rounded-xl p-4 text-center neon-border">
                <p className="text-white/60">Someone shared a musical creation with you! Press play to listen.</p>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4 mb-8">
                {recording.notes.length > 0 && (() => {
                  const maxNoteIndex = Math.max(...recording.notes.map(n => n.noteIndex)) + 1;
                  const startNoteIndex = 7;
                  return Array.from({ length: maxNoteIndex }, (_, i) => {
                    const noteIndex = (startNoteIndex + i) % NOTES.length;
                    const note = NOTES[noteIndex];
                    const colors = ["from-cyan-500/70 to-cyan-600/50", "from-fuchsia-500/70 to-fuchsia-600/50", "from-violet-500/70 to-violet-600/50", "from-emerald-500/70 to-emerald-600/50", "from-amber-500/70 to-amber-600/50", "from-rose-500/70 to-rose-600/50"];
                    return (
                      <div key={i} data-note-index={i} data-note={note}
                        className={`bg-gradient-to-br ${colors[i % colors.length]} rounded-xl border border-white/10 flex items-center justify-center aspect-square relative overflow-hidden`}
                        style={{ boxShadow: "0 0 6px rgba(0,255,255,0.15)" }}>
                        <span className="text-[10px] text-white/40 absolute bottom-1 right-1.5 font-mono">{note}</span>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex justify-center mt-6">
                <Button className="px-6 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-medium rounded-full border border-emerald-500/30 neon-glow-cyan" onClick={playRecording} disabled={isPlaying}>
                  <Play className="h-5 w-5 mr-2" />{isPlaying ? "Playing..." : "Play Music"}
                </Button>
              </div>

              <div className="mt-8 text-center text-sm text-white/40">
                <p>This piece uses the "{recording.soundMode}" sound{recording.beatPattern !== "none" ? ` with a "${recording.beatPattern}" beat.` : "."}</p>
                <p className="mt-1">{recording.notes.length} notes</p>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-white/70 mb-2">Recording Not Found</h2>
              <p className="text-white/40 mb-6">The shared music piece you're looking for doesn't exist or has been removed.</p>
              <Link href="/"><Button className="bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/30">Create Your Own</Button></Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
