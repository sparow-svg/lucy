import { motion } from "framer-motion";
import { useAudioVolume } from "@/hooks/use-audio-volume";
import type { AssistantState } from "@/hooks/use-assistant";

interface OrbProps {
  state: AssistantState;
  onClick: () => void;
}

export function Orb({ state, onClick }: OrbProps) {
  const isListening = state === 'listening';
  const volume = useAudioVolume(isListening);

  // Animation variants
  const variants = {
    idle: {
      scale: [1, 1.02, 1],
      opacity: 0.9,
      transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
    },
    listening: {
      // Scale dynamically based on volume
      scale: 1.05 + (volume * 0.4),
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 }
    },
    thinking: {
      scale: [1, 0.95, 1.05, 1],
      opacity: 0.8,
      transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
    },
    speaking: {
      scale: [1.05, 1.15, 1.05],
      opacity: 1,
      boxShadow: [
        "0px 0px 40px -10px rgba(0,0,0,0.1)",
        "0px 0px 80px -5px rgba(0,0,0,0.15)",
        "0px 0px 40px -10px rgba(0,0,0,0.1)"
      ],
      transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" }
    }
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer blurred halo */}
      <motion.div
        className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-3xl z-0 pointer-events-none"
        style={{
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.05), inset 0 0 40px rgba(255,255,255,0.5)',
        }}
        variants={variants}
        animate={state}
      />
      
      {/* Core interactive Orb */}
      <motion.div
        onClick={onClick}
        className="relative z-10 w-36 h-36 rounded-full cursor-pointer overflow-hidden flex items-center justify-center group"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(240,240,240,0.8) 100%)',
          boxShadow: `
            0 10px 40px -10px rgba(0,0,0,0.08),
            inset 0 -10px 20px -10px rgba(0,0,0,0.05),
            inset 0 10px 20px -10px rgba(255,255,255,1),
            0 0 0 1px rgba(0,0,0,0.03)
          `
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        variants={variants}
        animate={state}
      >
        {/* Subtle inner reflection */}
        <div className="absolute top-2 left-4 w-12 h-6 bg-white/60 rounded-full blur-sm rotate-12 pointer-events-none" />
        
        {/* Colorful speaking glow */}
        {state === 'speaking' && (
          <motion.div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            animate={{ 
              background: [
                'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0) 100%)',
                'radial-gradient(circle at center, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 80%)',
                'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0) 100%)'
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}
      </motion.div>
    </div>
  );
}
