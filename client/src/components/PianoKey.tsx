import { motion } from "framer-motion";
import { useState } from "react";

interface PianoKeyProps {
  note: string;
  colorClass: string;
  isActive: boolean;
  onClick: () => void;
  animationsEnabled: boolean;
  padIndex?: number;
}

const NEON_COLORS = [
  { bg: 'from-cyan-500/80 to-cyan-600/60', glow: 'rgba(0,255,255,0.5)', ring: 'ring-cyan-400/40' },
  { bg: 'from-fuchsia-500/80 to-fuchsia-600/60', glow: 'rgba(255,0,200,0.5)', ring: 'ring-fuchsia-400/40' },
  { bg: 'from-violet-500/80 to-violet-600/60', glow: 'rgba(139,92,246,0.5)', ring: 'ring-violet-400/40' },
  { bg: 'from-emerald-500/80 to-emerald-600/60', glow: 'rgba(16,185,129,0.5)', ring: 'ring-emerald-400/40' },
  { bg: 'from-amber-500/80 to-amber-600/60', glow: 'rgba(245,158,11,0.5)', ring: 'ring-amber-400/40' },
  { bg: 'from-rose-500/80 to-rose-600/60', glow: 'rgba(244,63,94,0.5)', ring: 'ring-rose-400/40' },
  { bg: 'from-blue-500/80 to-indigo-600/60', glow: 'rgba(59,130,246,0.5)', ring: 'ring-blue-400/40' },
  { bg: 'from-pink-500/80 to-purple-600/60', glow: 'rgba(236,72,153,0.5)', ring: 'ring-pink-400/40' },
];

const PianoKey = ({
  note,
  colorClass,
  isActive,
  onClick,
  animationsEnabled,
  padIndex = 0
}: PianoKeyProps) => {
  const [showRipple, setShowRipple] = useState(false);
  const neonColor = NEON_COLORS[padIndex % NEON_COLORS.length];

  const handleClick = () => {
    onClick();
    if (animationsEnabled) {
      setShowRipple(true);
      setTimeout(() => setShowRipple(false), 600);
    }
  };

  return (
    <motion.div
      className={`relative rounded-xl flex items-center justify-center aspect-square cursor-pointer overflow-hidden
        bg-gradient-to-br ${neonColor.bg} border border-white/10 ring-1 ${neonColor.ring}
        hover:brightness-125 transition-all duration-150 select-none`}
      style={{
        boxShadow: isActive 
          ? `0 0 20px ${neonColor.glow}, 0 0 40px ${neonColor.glow}, inset 0 0 15px ${neonColor.glow}`
          : `0 0 6px ${neonColor.glow.replace('0.5', '0.15')}, inset 0 0 4px ${neonColor.glow.replace('0.5', '0.05')}`,
      }}
      whileTap={animationsEnabled ? { scale: 0.92 } : {}}
      whileHover={animationsEnabled ? { scale: 1.05 } : {}}
      animate={isActive && animationsEnabled ? { scale: [1, 0.9, 1.02, 1] } : {}}
      transition={{ duration: 0.25 }}
      onClick={handleClick}
    >
      <span className="text-[10px] sm:text-xs text-white/50 absolute bottom-1 right-1.5 font-mono font-medium">
        {note}
      </span>

      {isActive && animationsEnabled && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ background: `radial-gradient(circle, ${neonColor.glow} 0%, transparent 70%)` }}
          initial={{ opacity: 0.8, scale: 0.5 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.4 }}
        />
      )}

      {showRipple && animationsEnabled && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2"
          style={{ borderColor: neonColor.glow }}
          initial={{ opacity: 0.6, scale: 0.3 }}
          animate={{ opacity: 0, scale: 2.5 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-xl pointer-events-none" 
           style={{ height: '40%' }} />
    </motion.div>
  );
};

export default PianoKey;
