import { useAssistant } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { Transcript } from "@/components/Transcript";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const THINKING_FILLERS = ["Hmm…", "Got it…", "Right…", "Let me think…", "Sure…"];

// ── Micro-blink ──────────────────────────────────────────────────────────────
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
    timerRef.current = setTimeout(schedule, 2200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return phase;
}

// Orb sphere diameter = SIZE(80), container = SIZE+40 = 120 → half = 60
// Status label sits: screen center + 60px (half container) + 10px gap = +70px
const STATUS_TOP  = 'calc(50vh + 70px)';
const STATUS_FONT = 10;

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
    isPaused            ? 'Say "Lucy" to continue' :
    state === 'dormant' ? 'Say "Lucy" to start' :
    state === 'listening' ? 'Listening…' :
    state === 'thinking'  ? THINKING_FILLERS[fillerIdx] :
    null;

  const blinkScale    = blinkPhase === 'open' ? 0 : 1;
  const blinkDuration = blinkPhase === 'closing' ? '0.08s' : blinkPhase === 'opening' ? '0.13s' : '0s';

  return (
    <div className="w-screen h-screen relative overflow-hidden">

      {/*
        New eye image — pupil is exactly at the center of the source image,
        so object-position:center maps pupil → screen center precisely.
      */}
      <img
        src="/bg-eye.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 0 }}
      />

      {/* Subtle edge vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.20) 100%)',
      }} />

      {/* Upper eyelid blink */}
      <div aria-hidden="true" className="absolute left-0 right-0 pointer-events-none" style={{
        top: 0, height: '60%', zIndex: 8,
        background: 'linear-gradient(to bottom, #1a0f0d 85%, transparent 100%)',
        transformOrigin: 'top center',
        transform: `scaleY(${blinkScale})`,
        transition: `transform ${blinkDuration} ease-in-out`,
        willChange: 'transform',
      }} />
      {/* Lower eyelid blink */}
      <div aria-hidden="true" className="absolute left-0 right-0 pointer-events-none" style={{
        bottom: 0, height: '40%', zIndex: 8,
        background: 'linear-gradient(to top, #1a0f0d 85%, transparent 100%)',
        transformOrigin: 'bottom center',
        transform: `scaleY(${blinkScale})`,
        transition: `transform ${blinkDuration} ease-in-out`,
        willChange: 'transform',
      }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-16">
        <span className="select-none" style={{
          fontSize: 17, fontWeight: 600, letterSpacing: '-0.03em',
          fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }}>Lucy</span>
        <span className="select-none" style={{
          fontSize: 13, fontWeight: 500, letterSpacing: '0.01em',
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'rgba(255,255,255,0.60)', textShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}>Jess</span>
      </header>

      {/*
        Orb — position:fixed at exactly 50vw / 50vh.
        Fixed means viewport-relative: unaffected by any layout, scrolling,
        or DOM structure changes. The orb will NEVER move.
      */}
      <div style={{
        position: 'fixed',
        top: '50vh', left: '50vw',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
      }}>
        <Orb
          state={state}
          onClick={toggleRecording}
          isSessionActive={isSessionActive}
          isPaused={isPaused}
          micVolume={micVolume}
        />
      </div>

      {/*
        Status label — fixed, exactly below the orb.
        Uses 50vh + half orb container (60px) + 10px gap.
        Smaller font (10px) so it reads as a subtle hint, not a heading.
      */}
      <div style={{
        position: 'fixed',
        top: STATUS_TOP,
        left: 0, right: 0,
        zIndex: 20,
        display: 'flex', justifyContent: 'center',
      }}>
        <AnimatePresence mode="wait">
          {statusLabel && (
            <motion.span
              key={statusLabel}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="select-none"
              style={{
                fontSize: STATUS_FONT,
                color: isPaused ? 'rgba(255,255,255,0.46)' : 'rgba(255,255,255,0.55)',
                letterSpacing: '0.07em',
                fontFamily: "'Inter', system-ui, sans-serif",
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {statusLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/*
        Transcript — fixed at bottom, grows upward.
        Never affects orb position since orb is fixed.
      */}
      <div style={{
        position: 'fixed',
        bottom: 64, left: 0, right: 0,
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <Transcript messages={messages} />
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 right-0 pb-5 pr-8 z-50 pointer-events-none">
        <span className="select-none" style={{
          fontSize: 11, color: 'rgba(255,255,255,0.28)',
          fontFamily: "'Inter', system-ui, sans-serif",
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
          Latency: &lt;300ms&nbsp;&nbsp;|&nbsp;&nbsp;Subscribed
        </span>
      </footer>
    </div>
  );
}
