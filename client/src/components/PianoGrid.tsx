import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import PianoKey from "./PianoKey";
import { useIsMobile } from "@/hooks/use-mobile";
import { playNote, type SoundMode } from "@/lib/audio";

// Define piano notes for our grid
const NOTES = [
  'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
  'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6'
];

// Configure theme colors
const THEME_COLORS = {
  blue: [
    'bg-blue-400', 'bg-blue-500', 'bg-blue-600',
    'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600'
  ],
  purple: [
    'bg-purple-400', 'bg-purple-500', 'bg-purple-600',
    'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600'
  ],
  pink: [
    'bg-pink-400', 'bg-pink-500', 'bg-pink-600',
    'bg-rose-400', 'bg-rose-500', 'bg-rose-600'
  ],
  green: [
    'bg-green-400', 'bg-green-500', 'bg-green-600',
    'bg-emerald-400', 'bg-emerald-500', 'bg-emerald-600'
  ]
};

// Configure sound mode colors
const SOUND_MODE_COLORS = {
  piano: 'blue',
  synth: 'purple',
  chiptune: 'green',
  funk: 'pink'
};

interface PianoGridProps {
  onNotePlayed: (noteIndex: number) => void;
  volume: number;
  animationsEnabled: boolean;
  themeColor: string;
  soundMode?: SoundMode;
  gridSizeMultiplier?: number; // Multiplier for grid size (1-3)
}

const PianoGrid = forwardRef<any, PianoGridProps>(({ 
  onNotePlayed, 
  volume, 
  animationsEnabled, 
  themeColor = "blue",
  soundMode = "piano",
  gridSizeMultiplier = 1 // Default multiplier
}, ref) => {
  const isMobile = useIsMobile();
  const [activeKey, setActiveKey] = useState<number | null>(null);
  
  // Get effective theme color - use explicitly set theme color from settings
  const effectiveThemeColor = useMemo(() => {
    // Only use sound mode color as a fallback
    return themeColor || SOUND_MODE_COLORS[soundMode];
  }, [themeColor, soundMode]);
  
  // Determine base grid dimensions based on screen size
  const baseGridDimensions = useMemo(() => {
    if (isMobile) {
      return { rows: 4, cols: 4 }; // 4x4 grid for mobile
    }
    else if (window.innerWidth < 768) {
      return { rows: 5, cols: 5 }; // 5x5 for tablet
    }
    else {
      return { rows: 6, cols: 6 }; // 6x6 for desktop
    }
  }, [isMobile]);
  
  // Calculate actual grid dimensions based on multiplier
  const gridDimensions = useMemo(() => {
    // Ensure the multiplier is within allowed range (1-3)
    const safeMultiplier = Math.max(1, Math.min(3, gridSizeMultiplier));
    
    // For mobile devices, increase rows rather than total grid size to prevent tiny buttons
    if (isMobile) {
      const multipliedRows = baseGridDimensions.rows + (safeMultiplier - 1) * 2;
      return {
        rows: multipliedRows,
        cols: baseGridDimensions.cols,
        total: multipliedRows * baseGridDimensions.cols
      };
    }
    
    // For larger screens, scale both dimensions
    const multipliedRows = baseGridDimensions.rows + (safeMultiplier - 1) * 2;
    const multipliedCols = baseGridDimensions.cols + (safeMultiplier - 1) * 2;
    
    return {
      rows: multipliedRows,
      cols: multipliedCols,
      total: multipliedRows * multipliedCols
    };
  }, [baseGridDimensions, gridSizeMultiplier, isMobile]);
  
  // Total grid size
  const gridSize = gridDimensions.total;
  
  // Create an array of notes based on grid size
  const gridNotes = useMemo(() => {
    // For standard grid size, use middle-range notes
    let startNoteIndex = 0;
    
    // Start from different octaves based on the grid size multiplier
    if (gridSizeMultiplier === 1) {
      // Standard grid uses C3-B5 (middle range for standard piano)
      startNoteIndex = 7; // Start from C3
    } else if (gridSizeMultiplier === 2) {
      // Large grid uses C2-B6 (wider range)
      startNoteIndex = 0; // Start from C2
    } else {
      // Extra large grid uses the full range
      startNoteIndex = 0; // Start from C2
    }
    
    return Array.from({ length: gridSize }, (_, i) => {
      // Calculate the note index, ensuring we don't exceed the available notes
      const noteIndex = (startNoteIndex + i) % NOTES.length;
      // Color class based on theme
      const colorIndex = i % THEME_COLORS[effectiveThemeColor as keyof typeof THEME_COLORS].length;
      const colorClass = THEME_COLORS[effectiveThemeColor as keyof typeof THEME_COLORS][colorIndex];
      
      return {
        note: NOTES[noteIndex],
        colorClass
      };
    });
  }, [gridSize, effectiveThemeColor, gridSizeMultiplier]);
  
  // Handle key click
  const handleKeyClick = (index: number) => {
    setActiveKey(index);
    playNote(gridNotes[index].note, volume, soundMode);
    onNotePlayed(index);
    
    // Reset active key after animation
    setTimeout(() => {
      setActiveKey(null);
    }, 300);
  };
  
  // Expose playNoteByIndex method to parent component
  useImperativeHandle(ref, () => ({
    playNoteByIndex: (index: number) => {
      if (index >= 0 && index < gridSize) {
        handleKeyClick(index);
      }
    }
  }));
  
  // Calculate grid column classes based on dimensions
  const gridColumnClass = `grid-cols-${gridDimensions.cols}`;
  
  return (
    <motion.div 
      className={`grid ${gridColumnClass} gap-3 sm:gap-4 mb-8`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, staggerChildren: 0.05 }}
    >
      {gridNotes.map((item, index) => (
        <PianoKey
          key={index}
          note={item.note}
          colorClass={item.colorClass}
          isActive={activeKey === index}
          onClick={() => handleKeyClick(index)}
          animationsEnabled={animationsEnabled}
        />
      ))}
    </motion.div>
  );
});

PianoGrid.displayName = "PianoGrid";

export default PianoGrid;
