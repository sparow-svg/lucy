import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { AssistantState } from "@/hooks/use-assistant";

interface OrbProps {
  state: AssistantState;
  onClick: () => void;
  isSessionActive: boolean;
}

function useMicVolume(active: boolean) {
  const [volume, setVolume] = useState(0);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active) {
      setVolume(0);
      if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let live = true;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (!live) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!live) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        setVolume(Math.min(1, Math.sqrt(sum / data.length) * 6));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => {});

    return () => {
      live = false;
      cancelAnimationFrame(rafRef.current);
      if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };
  }, [active]);

  return volume;
}

export function Orb({ state, onClick, isSessionActive }: OrbProps) {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'thinking';
  const isDormant = state === 'dormant';

  const micVolume = useMicVolume(isListening);

  // Spring-physics scale driven by volume when listening
  const rawScale = useSpring(1, { stiffness: 280, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (isListening) {
      rawScale.set(1 + micVolume * 0.55);
    } else if (isSpeaking) {
      rawScale.set(1);
    } else {
      rawScale.set(1);
    }
  }, [isListening, isSpeaking, micVolume, rawScale]);

  // Glow opacity spring
  const glowSpring = useSpring(0, { stiffness: 120, damping: 20 });
  useEffect(() => {
    if (isDormant) glowSpring.set(0);
    else if (isListening) glowSpring.set(0.7 + micVolume * 0.3);
    else if (isSpeaking) glowSpring.set(0.5);
    else if (isThinking) glowSpring.set(0.3);
    else glowSpring.set(0.15);
  }, [isDormant, isListening, isSpeaking, isThinking, micVolume, glowSpring]);

  const glowBlur = useTransform(glowSpring, [0, 1], [8, 32]);

  // Orb size — 60px base
  const orbSize = 60;

  const idlePulse = !isDormant && !isListening && !isSpeaking && !isThinking;

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer select-none"
      style={{ width: orbSize + 80, height: orbSize + 80 }}
      onClick={onClick}
    >
      {/* Glow halo */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: orbSize + 40,
          height: orbSize + 40,
          left: '50%',
          top: '50%',
          x: '-50%',
          y: '-50%',
          opacity: glowSpring,
          filter: `blur(${glowBlur.get()}px)`,
          background: isListening
            ? 'radial-gradient(circle, rgba(99,179,237,0.6) 0%, transparent 70%)'
            : isSpeaking
            ? 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(180,180,180,0.4) 0%, transparent 70%)',
        }}
        animate={{
          opacity: isDormant ? 0 : undefined,
          filter: `blur(${isListening ? 20 + micVolume * 14 : 14}px)`,
        }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      />

      {/* Core orb */}
      <motion.div
        style={{
          width: orbSize,
          height: orbSize,
          scale: rawScale,
          borderRadius: '50%',
          position: 'relative',
          zIndex: 10,
          background: isDormant
            ? 'radial-gradient(circle at 38% 35%, #f0f0f0 0%, #e0e0e0 100%)'
            : isListening
            ? 'radial-gradient(circle at 38% 35%, #bfdbfe 0%, #93c5fd 40%, #60a5fa 100%)'
            : isSpeaking
            ? 'radial-gradient(circle at 38% 35%, #ddd6fe 0%, #c4b5fd 40%, #a78bfa 100%)'
            : isThinking
            ? 'radial-gradient(circle at 38% 35%, #e0e7ff 0%, #c7d2fe 40%, #a5b4fc 100%)'
            : 'radial-gradient(circle at 38% 35%, #f8f8f8 0%, #e8e8e8 40%, #d4d4d4 100%)',
          boxShadow: isDormant
            ? '0 2px 12px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.9)'
            : isListening
            ? '0 4px 24px rgba(96,165,250,0.4), inset 0 1px 3px rgba(255,255,255,0.8)'
            : isSpeaking
            ? '0 4px 24px rgba(167,139,250,0.4), inset 0 1px 3px rgba(255,255,255,0.8)'
            : '0 3px 16px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.9)',
        }}
        animate={idlePulse ? {
          scale: [1, 1.04, 1],
          boxShadow: [
            '0 3px 16px rgba(0,0,0,0.06)',
            '0 4px 20px rgba(0,0,0,0.09)',
            '0 3px 16px rgba(0,0,0,0.06)',
          ]
        } : {}}
        transition={idlePulse ? {
          repeat: Infinity,
          duration: 3.5,
          ease: 'easeInOut',
        } : { type: 'spring', stiffness: 280, damping: 18 }}
        whileHover={isSessionActive ? { scale: 1.06 } : {}}
        whileTap={isSessionActive ? { scale: 0.94 } : {}}
      >
        {/* Inner specular highlight */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '45%',
            height: '28%',
            top: '14%',
            left: '18%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, transparent 100%)',
            transform: 'rotate(-15deg)',
          }}
        />
      </motion.div>

      {/* Thinking ripple ring */}
      {isThinking && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{ width: orbSize + 16, height: orbSize + 16, border: '1px solid rgba(165,180,252,0.4)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        />
      )}

      {/* Speaking wave rings */}
      {isSpeaking && [0, 1].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{ width: orbSize + 10, height: orbSize + 10, border: '1px solid rgba(167,139,250,0.3)' }}
          animate={{ scale: [1, 1.5 + i * 0.2], opacity: [0.5, 0] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.4, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
