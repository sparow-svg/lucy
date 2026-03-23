import { memo, useEffect } from "react";
import { motion, useSpring } from "framer-motion";
import type { AssistantState } from "@/hooks/use-assistant";

interface OrbProps {
  state: AssistantState;
  onClick: () => void;
  isSessionActive: boolean;
  micVolume?: number;
}

// Dormant/idle = deep black sphere (rests on the dark pupil invisibly).
// Active states = Apple blue family.
const PAL: Record<AssistantState, {
  core: string; mid: string; deep: string;
  glow: string; ring: string; specular: string;
}> = {
  dormant: {
    core: '#303030', mid: '#1a1a1a', deep: '#0a0a0a',
    glow: 'transparent', ring: 'rgba(255,255,255,0.06)',
    specular: 'rgba(255,255,255,0.14)',
  },
  idle: {
    core: '#242428', mid: '#161618', deep: '#080810',
    glow: 'transparent', ring: 'rgba(255,255,255,0.04)',
    specular: 'rgba(255,255,255,0.10)',
  },
  listening: {
    core: '#64D2FF', mid: '#0A84FF', deep: '#0051D5',
    glow: 'rgba(10,132,255,0.42)', ring: 'rgba(10,132,255,0.28)',
    specular: 'rgba(255,255,255,0.58)',
  },
  thinking: {
    core: '#5E9FFF', mid: '#0A6EFF', deep: '#0040CC',
    glow: 'rgba(10,110,255,0.34)', ring: 'rgba(10,110,255,0.22)',
    specular: 'rgba(255,255,255,0.48)',
  },
  speaking: {
    core: '#70D7FF', mid: '#34AADC', deep: '#0070C9',
    glow: 'rgba(52,170,220,0.40)', ring: 'rgba(52,170,220,0.24)',
    specular: 'rgba(255,255,255,0.52)',
  },
};

const SIZE = 160;

export const Orb = memo(function Orb({
  state, onClick, isSessionActive, micVolume = 0,
}: OrbProps) {
  const p = PAL[state];
  const isActive = state === 'listening' || state === 'speaking' || state === 'thinking';
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const isDark = state === 'dormant' || state === 'idle';

  const scale = useSpring(0.90, { stiffness: 180, damping: 24, mass: 0.9 });

  useEffect(() => {
    if (isListening) scale.set(1 + micVolume * 0.16);
    else if (isSpeaking) scale.set(1.05);
    else if (isThinking) scale.set(0.96);
    else if (state === 'idle') scale.set(1);
    else scale.set(0.90);
  }, [state, micVolume]);

  // Pure CSS radial gradients — no SVG filters (Safari GPU safe)
  const bg = `
    radial-gradient(circle at 30% 26%, ${p.core}f8 0%, transparent 54%),
    radial-gradient(circle at 68% 70%, ${p.deep}dd 0%, transparent 50%),
    radial-gradient(circle at 55% 46%, ${p.mid}bb 0%, transparent 62%),
    radial-gradient(circle at 16% 76%, ${p.mid}88 0%, transparent 38%),
    radial-gradient(circle at 82% 24%, ${p.mid}77 0%, transparent 36%),
    linear-gradient(145deg, ${p.core}, ${p.deep})
  `;

  const shadow = isDark
    ? `0 14px 56px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 ${p.specular}`
    : `0 10px 48px ${p.glow}, 0 4px 14px rgba(0,0,0,0.12), inset 0 1px 0 ${p.specular}`;

  return (
    <motion.div
      className="relative flex items-center justify-center cursor-pointer select-none"
      style={{ width: SIZE + 80, height: SIZE + 80 }}
      onClick={onClick}
      whileTap={isSessionActive ? { scale: 0.96 } : {}}
    >
      {/* Ambient glow — only when active */}
      {isActive && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: SIZE * 1.6,
            height: SIZE * 1.6,
            background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)`,
            filter: 'blur(32px)',
            opacity: isListening ? 0.55 + micVolume * 0.40 : 0.48,
            willChange: 'opacity',
          }}
        />
      )}

      {/* Core sphere */}
      <motion.div
        style={{
          width: SIZE,
          height: SIZE,
          scale,
          borderRadius: '50%',
          position: 'relative',
          zIndex: 10,
          background: bg,
          boxShadow: shadow,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={state === 'idle' ? {
          scale: [1, 1.022, 1, 1.011, 1],
        } : state === 'dormant' ? {
          scale: [0.90, 0.91, 0.90],
        } : state === 'thinking' ? {
          scale: [0.96, 0.975, 0.96],
        } : {}}
        transition={state === 'idle' ? {
          repeat: Infinity, duration: 5.5,
          ease: [0.4, 0, 0.6, 1], times: [0, 0.25, 0.5, 0.75, 1],
        } : state === 'dormant' ? {
          repeat: Infinity, duration: 7, ease: 'easeInOut',
        } : state === 'thinking' ? {
          repeat: Infinity, duration: 1.6, ease: 'easeInOut',
        } : { type: 'spring', stiffness: 180, damping: 24 }}
      >
        {/* Top-left specular — glass highlight */}
        <div style={{
          position: 'absolute',
          width: '50%', height: '30%',
          top: '11%', left: '13%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 42% 38%, ${p.specular} 0%, rgba(255,255,255,0.02) 65%, transparent 100%)`,
          transform: 'rotate(-18deg)',
          pointerEvents: 'none',
        }} />
        {/* Small bottom-right glint */}
        <div style={{
          position: 'absolute',
          width: '24%', height: '14%',
          bottom: '17%', right: '13%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${p.specular.replace(')', ', 0.32)')} 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />
      </motion.div>

      {/* Thinking: slow pulsing ring */}
      {isThinking && (
        <motion.div className="absolute rounded-full pointer-events-none"
          style={{ width: SIZE + 16, height: SIZE + 16, border: `1.5px solid ${p.ring}` }}
          animate={{ scale: [1.04, 1.24, 1.04], opacity: [0.55, 0, 0.55] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        />
      )}

      {/* Speaking: two expanding rings */}
      {isSpeaking && [0, 1].map(i => (
        <motion.div key={i} className="absolute rounded-full pointer-events-none"
          style={{ width: SIZE + 10, height: SIZE + 10, border: `1px solid ${p.ring}` }}
          animate={{ scale: [1, 1.44 + i * 0.26], opacity: [0.44, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.55, ease: 'easeOut' }}
        />
      ))}

      {/* Listening: volume-reactive ring */}
      {isListening && (
        <motion.div className="absolute rounded-full pointer-events-none"
          style={{ width: SIZE + 10, height: SIZE + 10, border: `1.5px solid ${p.ring}` }}
          animate={{ scale: 1 + micVolume * 0.10, opacity: 0.2 + micVolume * 0.65 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      )}
    </motion.div>
  );
});
