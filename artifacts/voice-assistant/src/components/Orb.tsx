import { memo, useEffect } from "react";
import { motion, useSpring } from "framer-motion";
import type { AssistantState } from "@/hooks/use-assistant";

interface OrbProps {
  state: AssistantState;
  onClick: () => void;
  isSessionActive: boolean;
  isPaused?: boolean;
  micVolume?: number;
}

const PAL: Record<AssistantState | 'paused', {
  core: string; mid: string; deep: string;
  glow: string; ring: string; specular: string;
}> = {
  // Dormant/idle: subtle iridescent blue-grey so the orb is *just* visible through
  // the screen blend-mode against the dark eye background — not black/invisible
  dormant: {
    core: '#3a3f5c', mid: '#22264a', deep: '#14172e',
    glow: 'transparent', ring: 'rgba(120,140,220,0.10)',
    specular: 'rgba(200,210,255,0.20)',
  },
  idle: {
    core: '#2e3450', mid: '#1c2040', deep: '#10132a',
    glow: 'transparent', ring: 'rgba(100,130,220,0.08)',
    specular: 'rgba(180,200,255,0.16)',
  },
  paused: {
    core: '#28294a', mid: '#16183a', deep: '#0c0d20',
    glow: 'transparent', ring: 'rgba(80,100,200,0.06)',
    specular: 'rgba(160,180,240,0.12)',
  },
  // Active states: bright blue/cyan — unchanged
  listening: {
    core: '#64D2FF', mid: '#0A84FF', deep: '#0051D5',
    glow: 'rgba(10,132,255,0.45)', ring: 'rgba(10,132,255,0.30)',
    specular: 'rgba(255,255,255,0.58)',
  },
  thinking: {
    core: '#5E9FFF', mid: '#0A6EFF', deep: '#0040CC',
    glow: 'rgba(10,110,255,0.36)', ring: 'rgba(10,110,255,0.22)',
    specular: 'rgba(255,255,255,0.48)',
  },
  speaking: {
    core: '#70D7FF', mid: '#34AADC', deep: '#0070C9',
    glow: 'rgba(52,170,220,0.42)', ring: 'rgba(52,170,220,0.26)',
    specular: 'rgba(255,255,255,0.52)',
  },
};

const SIZE = 80;

export const Orb = memo(function Orb({
  state, onClick, isSessionActive, isPaused = false, micVolume = 0,
}: OrbProps) {
  const key = isPaused ? 'paused' : state;
  const p = PAL[key];

  const isActive    = !isPaused && (state === 'listening' || state === 'speaking' || state === 'thinking');
  const isListening = !isPaused && state === 'listening';
  const isSpeaking  = !isPaused && state === 'speaking';
  const isThinking  = !isPaused && state === 'thinking';
  const isDark      = isPaused || state === 'dormant' || state === 'idle';

  const scale = useSpring(0.90, { stiffness: 180, damping: 24, mass: 0.9 });

  useEffect(() => {
    if (isPaused)         scale.set(0.88);
    else if (isListening) scale.set(1 + micVolume * 0.16);
    else if (isSpeaking)  scale.set(1.05);
    else if (isThinking)  scale.set(0.96);
    else if (state === 'idle')    scale.set(1);
    else                  scale.set(0.90);
  }, [state, isPaused, micVolume]);

  const bg = `
    radial-gradient(circle at 30% 26%, ${p.core}f8 0%, transparent 54%),
    radial-gradient(circle at 68% 70%, ${p.deep}dd 0%, transparent 50%),
    radial-gradient(circle at 55% 46%, ${p.mid}bb 0%, transparent 62%),
    radial-gradient(circle at 16% 76%, ${p.mid}88 0%, transparent 38%),
    radial-gradient(circle at 82% 24%, ${p.mid}77 0%, transparent 36%),
    linear-gradient(145deg, ${p.core}, ${p.deep})
  `;

  const shadow = isDark
    ? `0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.30), inset 0 1px 0 ${p.specular}`
    : `0 6px 28px ${p.glow}, 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 ${p.specular}`;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer select-none"
      style={{
        width: SIZE + 40, height: SIZE + 40,
        mixBlendMode: 'screen',
      }}
      onClick={onClick}
    >
      {/* Blue ambient glow — active states: radiates outward from the orb */}
      {isActive && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: SIZE * 2.2,
            height: SIZE * 2.2,
            background: `radial-gradient(circle, ${p.glow} 0%, transparent 68%)`,
            filter: 'blur(22px)',
            opacity: isListening ? 0.60 + micVolume * 0.35 : 0.52,
          }}
        />
      )}

      {/* Core sphere */}
      <motion.div
        style={{
          width: SIZE, height: SIZE,
          scale,
          borderRadius: '50%',
          position: 'relative',
          zIndex: 10,
          background: bg,
          boxShadow: shadow,
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
        animate={isPaused ? { scale: [0.88, 0.89, 0.88] } :
          state === 'idle' ? { scale: [1, 1.022, 1, 1.011, 1] } :
          state === 'dormant' ? { scale: [0.90, 0.91, 0.90] } :
          state === 'thinking' ? { scale: [0.96, 0.975, 0.96] } :
          {}}
        transition={
          isPaused ? { repeat: Infinity, duration: 8, ease: 'easeInOut' } :
          state === 'idle' ? { repeat: Infinity, duration: 5.5, ease: [0.4,0,0.6,1], times:[0,.25,.5,.75,1] } :
          state === 'dormant' ? { repeat: Infinity, duration: 7, ease: 'easeInOut' } :
          state === 'thinking' ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } :
          { type: 'spring', stiffness: 180, damping: 24 }
        }
      >
        {/* Glass highlight — top left */}
        <div style={{
          position: 'absolute', width: '50%', height: '30%',
          top: '11%', left: '13%', borderRadius: '50%',
          background: `radial-gradient(ellipse at 42% 38%, ${p.specular} 0%, rgba(255,255,255,0.02) 65%, transparent 100%)`,
          transform: 'rotate(-18deg)', pointerEvents: 'none',
        }} />
        {/* Small bottom glint */}
        <div style={{
          position: 'absolute', width: '24%', height: '14%',
          bottom: '17%', right: '13%', borderRadius: '50%',
          background: `radial-gradient(ellipse, ${p.specular.replace(')', ', 0.32)')} 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />
      </motion.div>

      {/* Thinking: pulsing ring */}
      {isThinking && (
        <motion.div className="absolute rounded-full pointer-events-none"
          style={{ width: SIZE + 8, height: SIZE + 8, border: `1.5px solid ${p.ring}` }}
          animate={{ scale: [1.04, 1.28, 1.04], opacity: [0.55, 0, 0.55] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        />
      )}

      {/* Speaking: expanding rings */}
      {isSpeaking && [0, 1].map(i => (
        <motion.div key={i} className="absolute rounded-full pointer-events-none"
          style={{ width: SIZE + 6, height: SIZE + 6, border: `1px solid ${p.ring}` }}
          animate={{ scale: [1, 1.5 + i * 0.28], opacity: [0.44, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.55, ease: 'easeOut' }}
        />
      ))}

      {/* Listening: volume-reactive ring */}
      {isListening && (
        <motion.div className="absolute rounded-full pointer-events-none"
          style={{ width: SIZE + 6, height: SIZE + 6, border: `1.5px solid ${p.ring}` }}
          animate={{ scale: 1 + micVolume * 0.10, opacity: 0.2 + micVolume * 0.65 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
      )}
    </div>
  );
});
