import { motion } from "framer-motion";

interface PianoKeyProps {
  note: string;
  colorClass: string;
  isActive: boolean;
  onClick: () => void;
  animationsEnabled: boolean;
}

const PianoKey = ({
  note,
  colorClass,
  isActive,
  onClick,
  animationsEnabled
}: PianoKeyProps) => {
  return (
    <motion.div
      className={`${colorClass} rounded-xl shadow-md flex items-center justify-center aspect-square cursor-pointer hover:shadow-lg relative overflow-hidden max-w-[120px] max-h-[120px] w-full h-full`}
      whileTap={animationsEnabled ? { scale: 0.95 } : {}}
      whileHover={animationsEnabled ? { scale: 1.02 } : {}}
      animate={isActive && animationsEnabled ? { scale: [1, 0.92, 1] } : {}}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      {/* Note label */}
      <span className="text-xs text-white text-opacity-60 absolute bottom-1 right-1 font-medium">
        {note}
      </span>
      
      {/* Animation effect on click */}
      {isActive && animationsEnabled && (
        <motion.div
          className="absolute inset-0 bg-white rounded-xl"
          initial={{ opacity: 0.5, scale: 0.3 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.div>
  );
};

export default PianoKey;
