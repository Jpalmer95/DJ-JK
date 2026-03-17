import { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import PianoKey from "./PianoKey";
import { useIsMobile } from "@/hooks/use-mobile";
import { playNote, type SoundMode } from "@/lib/audio";

const NOTES = [
  'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
  'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6'
];

interface PianoGridProps {
  onNotePlayed: (noteIndex: number) => void;
  volume: number;
  animationsEnabled: boolean;
  themeColor: string;
  soundMode?: SoundMode;
  gridSizeMultiplier?: number;
  compact?: boolean;
}

const PianoGrid = forwardRef<any, PianoGridProps>(({
  onNotePlayed,
  volume,
  animationsEnabled,
  themeColor = "blue",
  soundMode = "piano",
  gridSizeMultiplier = 1,
  compact = false
}, ref) => {
  const isMobile = useIsMobile();
  const [activeKey, setActiveKey] = useState<number | null>(null);

  const baseGridDimensions = useMemo(() => {
    if (compact) return { rows: 4, cols: 4 };
    if (isMobile) return { rows: 4, cols: 4 };
    else if (window.innerWidth < 768) return { rows: 5, cols: 5 };
    else return { rows: 6, cols: 6 };
  }, [isMobile, compact]);

  const gridDimensions = useMemo(() => {
    const safeMultiplier = Math.max(1, Math.min(3, gridSizeMultiplier));
    if (isMobile || compact) {
      const multipliedRows = baseGridDimensions.rows + (safeMultiplier - 1) * 2;
      return { rows: multipliedRows, cols: baseGridDimensions.cols, total: multipliedRows * baseGridDimensions.cols };
    }
    const multipliedRows = baseGridDimensions.rows + (safeMultiplier - 1) * 2;
    const multipliedCols = baseGridDimensions.cols + (safeMultiplier - 1) * 2;
    return { rows: multipliedRows, cols: multipliedCols, total: multipliedRows * multipliedCols };
  }, [baseGridDimensions, gridSizeMultiplier, isMobile, compact]);

  const gridSize = gridDimensions.total;

  const gridNotes = useMemo(() => {
    let startNoteIndex = gridSizeMultiplier === 1 ? 7 : 0;
    return Array.from({ length: gridSize }, (_, i) => {
      const noteIndex = (startNoteIndex + i) % NOTES.length;
      return { note: NOTES[noteIndex], index: i };
    });
  }, [gridSize, gridSizeMultiplier]);

  const handleKeyClick = (index: number) => {
    setActiveKey(index);
    playNote(gridNotes[index].note, volume, soundMode);
    onNotePlayed(index);
    setTimeout(() => setActiveKey(null), 300);
  };

  useImperativeHandle(ref, () => ({
    playNoteByIndex: (index: number) => {
      if (index >= 0 && index < gridSize) handleKeyClick(index);
    }
  }));

  return (
    <motion.div
      className={`grid gap-2 sm:gap-3 ${compact ? 'p-2' : 'p-4'}`}
      style={{ gridTemplateColumns: `repeat(${gridDimensions.cols}, minmax(0, 1fr))` }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {gridNotes.map((item, index) => (
        <PianoKey
          key={index}
          note={item.note}
          colorClass=""
          isActive={activeKey === index}
          onClick={() => handleKeyClick(index)}
          animationsEnabled={animationsEnabled}
          padIndex={index}
        />
      ))}
    </motion.div>
  );
});

PianoGrid.displayName = "PianoGrid";
export default PianoGrid;
