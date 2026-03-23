import { useAssistant } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { Transcript } from "@/components/Transcript";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const THINKING_FILLERS = ["Hmm…", "Got it…", "Right…", "Let me think…", "Sure…"];

// ── Micro-blink hook ─────────────────────────────────────────────────────────
type BlinkPhase = 'open' | 'closing' | 'opening';

function useBlink() {
  const [phase, setPhase] = useState<BlinkPhase>('open');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      const delay = 3200 + Math.random() * 4000;
      timerRef.current = setTimeout(() => {
        setPhase('closing');
        timerRef.current = setTimeout(() => {
          setPhase('opening');
          timerRef.current = setTimeout(() => { setPhase('open'); schedule(); }, 130);
        }, 80);
      }, delay);
    };
    timerRef.current = setTimeout(schedule, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return phase;
}

// ── Orb container size (must match SIZE in Orb.tsx) ──────────────────────────
const ORB_HALF = (80 + 40) / 2; // (SIZE + padding) / 2 = 60px

export default function Home() {
  const { state, messages, micVolume, isSessionActive, isPaused, toggleRecording } = useAssistant();
  const [fillerIdx, setFillerIdx] = useState(0);
  const blinkPhase = useBlink();

  useEffect(() => {
    if (state !== 'thinking') return;
    const iv = setInterval(() => setFillerIdx(i => (i + 1) % THINKING_FILLERS.length), 1800);
    return () => clearInterval(iv);
  }, [state]);

  const statusLabel =
    isPaused          ? 'say "Lucy" to continue' :
    state === 'dormant'   ? 'say "Lucy" to start' :
    state === 'listening' ? 'listening…' :
    state === 'thinking'  ? THINKING_FILLERS[fillerIdx] :
    null;

  const blinkScale    = blinkPhase === 'open' ? 0 : 1;
  const blinkDuration = blinkPhase === 'closing' ? '0.08s' : blinkPhase === 'opening' ? '0.13s' : '0s';

  return (
    <div className="min-h-screen w-full relative overflow-hidden">

      {/* ── Eye background ────────────────────────────────────────────────── */}
      <img
        src="/bg-eye.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ objectFit: 'cover', objectPosition: '44% 51%', zIndex: 0 }}
      />

      {/* Edge vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.20) 100%)',
        }}
      />

      {/* ── Eye blink overlays (upper + lower eyelid) ─────────────────────── */}
      <div aria-hidden="true" className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: 0, height: '60%', zIndex: 8,
          background: 'linear-gradient(to bottom, #1a0f0d 85%, transparent 100%)',
          transformOrigin: 'top center',
          transform: `scaleY(${blinkScale})`,
          transition: `transform ${blinkDuration} ease-in-out`,
          willChange: 'transform',
        }}
      />
      <div aria-hidden="true" className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: 0, height: '40%', zIndex: 8,
          background: 'linear-gradient(to top, #1a0f0d 85%, transparent 100%)',
          transformOrigin: 'bottom center',
          transform: `scaleY(${blinkScale})`,
          transition: `transform ${blinkDuration} ease-in-out`,
          willChange: 'transform',
        }}
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-8 h-16">
        <span className="select-none" style={{
          fontSize: 17, fontWeight: 600, letterSpacing: '-0.03em',
          fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}>Lucy</span>
      </header>

      {/* ── Orb — absolutely fixed at screen center, never moves ─────────── */}
      <div
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        <Orb
          state={state}
          onClick={toggleRecording}
          isSessionActive={isSessionActive}
          isPaused={isPaused}
          micVolume={micVolume}
        />
      </div>

      {/* ── Status label — just below the orb center ─────────────────────── */}
      {/*
        Orb container = SIZE(80) + padding(40) = 120px total, so half = 60px.
        Status is at screen center + 60px + 6px gap = top: calc(50% + 66px).
      */}
      <div
        style={{
          position: 'absolute',
          top: `calc(50% + ${ORB_HALF + 6}px)`,
          left: 0, right: 0,
          zIndex: 20,
          display: 'flex', justifyContent: 'center',
        }}
      >
        <AnimatePresence mode="wait">
          {statusLabel && (
            <motion.span
              key={statusLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="select-none"
              style={{
                fontSize: 12,
                color: isPaused ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.62)',
                letterSpacing: '0.06em',
                fontFamily: "'Inter', system-ui, sans-serif",
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              {statusLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Transcript — floats above footer, never affects orb position ──── */}
      <div
        style={{
          position: 'absolute',
          bottom: 64, left: 0, right: 0,
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        <Transcript messages={messages} />
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="fixed bottom-0 right-0 pb-5 pr-8 z-50 pointer-events-none">
        <span className="select-none" style={{
          fontSize: 11, color: 'rgba(255,255,255,0.32)',
          fontFamily: "'Inter', system-ui, sans-serif",
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
          Latency: &lt;300ms&nbsp;&nbsp;|&nbsp;&nbsp;Subscribed
        </span>
      </footer>
    </div>
  );
}
