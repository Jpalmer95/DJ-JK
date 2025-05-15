import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import PianoKey from "./PianoKey";
import { useIsMobile } from "@/hooks/use-mobile";
import { playNote, type SoundMode } from "@/lib/audio";

// Define piano notes for our grid
const NOTES = [
  'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'
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
}

const PianoGrid = forwardRef<any, PianoGridProps>(({ 
  onNotePlayed, 
  volume, 
  animationsEnabled, 
  themeColor = "blue",
  soundMode = "piano"
}, ref) => {
  const isMobile = useIsMobile();
  const [activeKey, setActiveKey] = useState<number | null>(null);
  
  // Get effective theme color - either selected or based on sound mode
  const effectiveThemeColor = useMemo(() => {
    const soundModeColor = SOUND_MODE_COLORS[soundMode];
    return soundModeColor || themeColor;
  }, [themeColor, soundMode]);
  
  // Determine grid size based on screen size
  const gridSize = useMemo(() => {
    if (isMobile) return 16; // 4x4 grid for mobile
    return window.innerWidth < 768 ? 25 : 36; // 5x5 for tablet, 6x6 for desktop
  }, [isMobile]);
  
  // Create an array of notes based on grid size
  const gridNotes = useMemo(() => {
    return Array.from({ length: gridSize }, (_, i) => ({
      note: NOTES[i % NOTES.length],
      colorClass: THEME_COLORS[effectiveThemeColor as keyof typeof THEME_COLORS][i % THEME_COLORS[effectiveThemeColor as keyof typeof THEME_COLORS].length]
    }));
  }, [gridSize, effectiveThemeColor]);
  
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
  
  // Determine grid columns based on screen size
  const gridColumns = isMobile ? 'grid-cols-4' : window.innerWidth < 768 ? 'grid-cols-5' : 'grid-cols-6';
  
  return (
    <motion.div 
      className={`grid ${gridColumns} gap-3 sm:gap-4 mb-8`}
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
