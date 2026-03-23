import { motion, useSpring } from "framer-motion";
import { useEffect, useId } from "react";
import type { AssistantState } from "@/hooks/use-assistant";

interface OrbProps {
  state: AssistantState;
  onClick: () => void;
  isSessionActive: boolean;
  micVolume?: number;
}

export function Orb({ state, onClick, isSessionActive, micVolume = 0 }: OrbProps) {
  const isDormant = state === 'dormant';
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const filterId = useId().replace(/:/g, '');

  const scaleSpring = useSpring(1, { stiffness: 220, damping: 20, mass: 0.7 });

  useEffect(() => {
    if (isListening) {
      scaleSpring.set(1 + micVolume * 0.18);
    } else if (isSpeaking) {
      scaleSpring.set(1.04);
    } else if (isThinking) {
      scaleSpring.set(0.97);
    } else if (isDormant) {
      scaleSpring.set(0.92);
    } else {
      scaleSpring.set(1);
    }
  }, [isListening, isSpeaking, isThinking, isDormant, micVolume, scaleSpring]);

  const orbSize = 200;
  const isIdle = state === 'idle';

  // Color palette per state
  const gradientConfig = {
    dormant: {
      stop1: '#b0bec5',
      stop2: '#90a4ae',
      stop3: '#607d8b',
      stop4: '#455a64',
    },
    idle: {
      stop1: '#81c8e8',
      stop2: '#4a9fc2',
      stop3: '#2e6e8c',
      stop4: '#1a4a6e',
    },
    listening: {
      stop1: '#93d3f0',
      stop2: '#56b4e0',
      stop3: '#2980b9',
      stop4: '#1a5276',
    },
    thinking: {
      stop1: '#9bb5e8',
      stop2: '#6c8fd6',
      stop3: '#3d5fbf',
      stop4: '#1e3a8a',
    },
    speaking: {
      stop1: '#a78bfa',
      stop2: '#7c5fcf',
      stop3: '#5b3fb8',
      stop4: '#3b2080',
    },
  };

  const colors = gradientConfig[state] ?? gradientConfig.idle;

  return (
    <>
      {/* SVG defs — noise filter + gradients */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id={`noise-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="4"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
            <feComposite in="blended" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      <motion.div
        className="relative flex items-center justify-center cursor-pointer select-none"
        style={{ width: orbSize + 120, height: orbSize + 120 }}
        onClick={onClick}
        whileTap={isSessionActive ? { scale: 0.97 } : {}}
      >
        {/* Soft ambient glow behind orb */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orbSize * 1.5,
            height: orbSize * 1.5,
            background: isDormant
              ? 'radial-gradient(circle, rgba(176,190,197,0.25) 0%, transparent 70%)'
              : isListening
              ? 'radial-gradient(circle, rgba(86,180,224,0.3) 0%, transparent 70%)'
              : isSpeaking
              ? 'radial-gradient(circle, rgba(167,139,250,0.28) 0%, transparent 70%)'
              : isThinking
              ? 'radial-gradient(circle, rgba(108,143,214,0.25) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(74,159,194,0.22) 0%, transparent 70%)',
            filter: 'blur(28px)',
          }}
          animate={{
            opacity: isDormant ? 0.4 : isListening ? 0.8 + micVolume * 0.2 : 0.65,
            scale: isListening ? 1 + micVolume * 0.12 : 1,
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />

        {/* Core orb */}
        <motion.div
          style={{
            width: orbSize,
            height: orbSize,
            scale: scaleSpring,
            borderRadius: '50%',
            position: 'relative',
            zIndex: 10,
            overflow: 'hidden',
            background: `
              radial-gradient(circle at 28% 22%, ${colors.stop1}ee 0%, transparent 55%),
              radial-gradient(circle at 72% 70%, ${colors.stop4}cc 0%, transparent 52%),
              radial-gradient(circle at 55% 45%, ${colors.stop2}bb 0%, transparent 65%),
              radial-gradient(circle at 15% 75%, ${colors.stop3}99 0%, transparent 42%),
              radial-gradient(circle at 85% 20%, ${colors.stop3}88 0%, transparent 38%),
              radial-gradient(circle at 50% 50%, ${colors.stop2} 0%, ${colors.stop4} 100%)
            `,
            boxShadow: isDormant
              ? '0 8px 40px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.3)'
              : isListening
              ? `0 12px 50px rgba(41,128,185,${0.3 + micVolume * 0.25}), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)`
              : isSpeaking
              ? '0 12px 50px rgba(92,63,184,0.35), 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.35)'
              : '0 10px 45px rgba(46,110,140,0.28), 0 3px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.35)',
          }}
          animate={isIdle ? {
            scale: [1, 1.025, 1, 1.015, 1],
          } : {}}
          transition={isIdle ? {
            repeat: Infinity,
            duration: 5,
            ease: [0.45, 0.05, 0.55, 0.95],
            times: [0, 0.25, 0.5, 0.75, 1],
          } : { type: 'spring', stiffness: 200, damping: 22 }}
        >
          {/* Noise grain overlay — applied via filter on a child div */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `
                radial-gradient(circle at 28% 22%, ${colors.stop1}ee 0%, transparent 55%),
                radial-gradient(circle at 72% 70%, ${colors.stop4}cc 0%, transparent 52%),
                radial-gradient(circle at 55% 45%, ${colors.stop2}bb 0%, transparent 65%),
                radial-gradient(circle at 15% 75%, ${colors.stop3}99 0%, transparent 42%),
                radial-gradient(circle at 85% 20%, ${colors.stop3}88 0%, transparent 38%),
                radial-gradient(circle at 50% 50%, ${colors.stop2} 0%, ${colors.stop4} 100%)
              `,
              filter: `url(#noise-${filterId})`,
              opacity: 0.75,
            }}
          />

          {/* Glass specular highlight — top left */}
          <div
            style={{
              position: 'absolute',
              width: '52%',
              height: '32%',
              top: '10%',
              left: '12%',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)',
              transform: 'rotate(-20deg)',
              pointerEvents: 'none',
            }}
          />

          {/* Secondary specular — bottom right */}
          <div
            style={{
              position: 'absolute',
              width: '30%',
              height: '18%',
              bottom: '14%',
              right: '10%',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        </motion.div>

        {/* Thinking — inward ripple ring */}
        {isThinking && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: orbSize + 20,
              height: orbSize + 20,
              border: '1.5px solid rgba(108,143,214,0.35)',
            }}
            animate={{ scale: [1.05, 1.2, 1.05], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          />
        )}

        {/* Speaking — two expanding rings */}
        {isSpeaking && [0, 1].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: orbSize + 12,
              height: orbSize + 12,
              border: '1px solid rgba(167,139,250,0.3)',
            }}
            animate={{ scale: [1, 1.45 + i * 0.25], opacity: [0.45, 0] }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              delay: i * 0.5,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Listening — reactive outer ring */}
        {isListening && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: orbSize + 8,
              height: orbSize + 8,
              border: '1px solid rgba(86,180,224,0.4)',
            }}
            animate={{
              scale: 1 + micVolume * 0.1,
              opacity: 0.3 + micVolume * 0.5,
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 18 }}
          />
        )}
      </motion.div>
    </>
  );
}
