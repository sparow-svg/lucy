import { memo, useEffect, useId } from "react";
import { motion, useSpring } from "framer-motion";
import type { AssistantState } from "@/hooks/use-assistant";

interface OrbProps {
  state: AssistantState;
  onClick: () => void;
  isSessionActive: boolean;
  micVolume?: number;
}

// State-driven gradient palettes — black at rest, Apple blue when active
const PALETTES: Record<AssistantState, { a: string; b: string; c: string; d: string; glow: string }> = {
  dormant: {
    a: '#2a2a2a', b: '#141414', c: '#0a0a0a', d: '#050505',
    glow: 'transparent',
  },
  idle: {
    a: '#2c2c2e', b: '#1c1c1e', c: '#111113', d: '#08080a',
    glow: 'transparent',
  },
  listening: {
    a: '#64D2FF', b: '#0A84FF', c: '#0051D5', d: '#003ABF',
    glow: 'rgba(10,132,255,0.35)',
  },
  thinking: {
    a: '#5E9FFF', b: '#0A6EFF', c: '#0040CC', d: '#002DA0',
    glow: 'rgba(10,110,255,0.28)',
  },
  speaking: {
    a: '#70D7FF', b: '#30B0F0', c: '#0080E0', d: '#0055C0',
    glow: 'rgba(48,176,240,0.3)',
  },
};

const ORB_SIZE = 200;

export const Orb = memo(function Orb({ state, onClick, isSessionActive, micVolume = 0 }: OrbProps) {
  const isDormant = state === 'dormant';
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const isIdle = state === 'idle';
  const isActive = isListening || isSpeaking || isThinking;
  const filterId = useId().replace(/:/g, '');

  const pal = PALETTES[state];

  const scaleSpring = useSpring(1, { stiffness: 200, damping: 22, mass: 0.8 });

  // Drive scale only on state/volume changes
  useEffect(() => {
    if (isListening) scaleSpring.set(1 + micVolume * 0.15);
    else if (isSpeaking) scaleSpring.set(1.04);
    else if (isThinking) scaleSpring.set(0.96);
    else if (isDormant) scaleSpring.set(0.94);
    else scaleSpring.set(1);
  }, [state, micVolume, isListening, isSpeaking, isThinking, isDormant, scaleSpring]);

  const gradient = `
    radial-gradient(circle at 30% 25%, ${pal.a}f0 0%, transparent 52%),
    radial-gradient(circle at 70% 72%, ${pal.d}dd 0%, transparent 50%),
    radial-gradient(circle at 55% 48%, ${pal.b}cc 0%, transparent 60%),
    radial-gradient(circle at 18% 78%, ${pal.c}99 0%, transparent 40%),
    radial-gradient(circle at 82% 22%, ${pal.c}88 0%, transparent 36%),
    radial-gradient(circle at 50% 50%, ${pal.b} 0%, ${pal.d} 100%)
  `.trim();

  const boxShadow = isDormant || isIdle
    ? '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
    : isListening
    ? `0 10px 48px ${pal.glow}, 0 3px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.18)`
    : isSpeaking
    ? `0 10px 48px ${pal.glow}, 0 3px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)`
    : `0 8px 36px ${pal.glow}, 0 2px 10px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)`;

  return (
    <>
      {/* SVG noise filter — scoped to this orb instance */}
      <svg width="0" height="0" aria-hidden style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id={`orb-noise-${filterId}`} x="-15%" y="-15%" width="130%" height="130%"
            colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4"
              stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
            <feComposite in="blended" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      <motion.div
        className="relative flex items-center justify-center cursor-pointer select-none"
        style={{ width: ORB_SIZE + 120, height: ORB_SIZE + 120 }}
        onClick={onClick}
        whileTap={isSessionActive ? { scale: 0.96 } : {}}
      >
        {/* Ambient glow — only when active */}
        {isActive && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: ORB_SIZE * 1.45,
              height: ORB_SIZE * 1.45,
              background: `radial-gradient(circle, ${pal.glow} 0%, transparent 72%)`,
              filter: 'blur(26px)',
            }}
            animate={{ opacity: isListening ? 0.7 + micVolume * 0.3 : 0.55 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Core sphere */}
        <motion.div
          style={{
            width: ORB_SIZE,
            height: ORB_SIZE,
            scale: scaleSpring,
            borderRadius: '50%',
            position: 'relative',
            zIndex: 10,
            overflow: 'hidden',
            background: gradient,
            boxShadow,
            willChange: 'transform',
          }}
          animate={isIdle ? {
            // Slow breathing when idle/dormant
            scale: [1, 1.022, 1, 1.012, 1],
          } : isDormant ? {
            scale: [0.94, 0.96, 0.94],
          } : {}}
          transition={isIdle ? {
            repeat: Infinity,
            duration: 5.5,
            ease: [0.4, 0, 0.6, 1],
            times: [0, 0.28, 0.5, 0.78, 1],
          } : isDormant ? {
            repeat: Infinity,
            duration: 6,
            ease: 'easeInOut',
          } : {
            type: 'spring',
            stiffness: 200,
            damping: 22,
          }}
        >
          {/* Noise grain overlay */}
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: gradient,
              filter: `url(#orb-noise-${filterId})`,
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />

          {/* Glass highlight — top left */}
          <div style={{
            position: 'absolute',
            width: '50%', height: '30%',
            top: '11%', left: '13%',
            borderRadius: '50%',
            background: isActive
              ? 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.05) 60%, transparent 100%)'
              : 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 60%, transparent 100%)',
            transform: 'rotate(-18deg)',
            pointerEvents: 'none',
          }} />

          {/* Secondary bottom-right glint */}
          <div style={{
            position: 'absolute',
            width: '26%', height: '15%',
            bottom: '16%', right: '12%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />
        </motion.div>

        {/* Thinking — slow inward ripple */}
        {isThinking && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: ORB_SIZE + 18, height: ORB_SIZE + 18,
              border: `1.5px solid ${pal.a}55`,
            }}
            animate={{ scale: [1.04, 1.2, 1.04], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />
        )}

        {/* Speaking — two expanding rings */}
        {isSpeaking && [0, 1].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: ORB_SIZE + 10, height: ORB_SIZE + 10,
              border: `1px solid ${pal.b}44`,
            }}
            animate={{ scale: [1, 1.42 + i * 0.22], opacity: [0.4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.55, ease: 'easeOut' }}
          />
        ))}

        {/* Listening — volume-reactive outer ring */}
        {isListening && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: ORB_SIZE + 10, height: ORB_SIZE + 10,
              border: `1px solid ${pal.a}66`,
            }}
            animate={{
              scale: 1 + micVolume * 0.09,
              opacity: 0.25 + micVolume * 0.55,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        )}
      </motion.div>
    </>
  );
});
