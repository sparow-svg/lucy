import { useAssistant } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { Transcript } from "@/components/Transcript";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const THINKING_FILLERS = ["Hmm…", "Got it…", "Right…", "Let me think…", "Sure…"];

// ── Micro-blink hook ─────────────────────────────────────────────────────────
// Fires a natural eye blink every 3–7 seconds with a slight random jitter.
// The blink has two phases: close (fast) and open (slightly slower).
// Implemented with CSS transitions only — zero rAF / canvas overhead.
type BlinkPhase = 'open' | 'closing' | 'opening';

function useBlink() {
  const [phase, setPhase] = useState<BlinkPhase>('open');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      const delay = 3200 + Math.random() * 4000; // 3.2–7.2s between blinks
      timerRef.current = setTimeout(() => {
        // Close (80ms)
        setPhase('closing');
        timerRef.current = setTimeout(() => {
          // Open (130ms)
          setPhase('opening');
          timerRef.current = setTimeout(() => {
            setPhase('open');
            schedule(); // queue next blink
          }, 130);
        }, 80);
      }, delay);
    };
    // First blink after a short warmup
    timerRef.current = setTimeout(schedule, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return phase;
}

export default function Home() {
  const { state, messages, micVolume, isSessionActive, toggleRecording } = useAssistant();
  const [fillerIdx, setFillerIdx] = useState(0);
  const blinkPhase = useBlink();

  useEffect(() => {
    if (state !== 'thinking') return;
    const iv = setInterval(() => setFillerIdx(i => (i + 1) % THINKING_FILLERS.length), 1800);
    return () => clearInterval(iv);
  }, [state]);

  const statusLabel =
    state === 'dormant'   ? 'say "Lucy" to start' :
    state === 'listening' ? 'listening…' :
    state === 'thinking'  ? THINKING_FILLERS[fillerIdx] :
    null;

  // Blink: scaleY 0→1 (closing), 1→0 (opening), held at 0 (open)
  const blinkScale = blinkPhase === 'open' ? 0 : blinkPhase === 'closing' ? 1 : 0;
  const blinkDuration = blinkPhase === 'closing' ? '0.08s' : blinkPhase === 'opening' ? '0.13s' : '0s';

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden">

      {/* Eye background — object-position pins the pupil to screen center */}
      <img
        src="/bg-eye.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ objectFit: 'cover', objectPosition: '44% 51%', zIndex: 0 }}
      />

      {/* Subtle edge vignette for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.2) 100%)',
        }}
      />

      {/*
        Eye micro-blink overlay.
        Upper eyelid: a dark strip that slides down from the top over ~80ms,
        then lifts back in ~130ms. Very subtle — covers ~55% of the screen
        so the lower eyelid naturally meets it before the iris is fully hidden.
        Origin is 'top' so it animates like a real upper eyelid.
      */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: 0,
          height: '60%',                          // upper eyelid covers top 60%
          zIndex: 8,
          background: 'linear-gradient(to bottom, #1a0f0d 85%, transparent 100%)',
          transformOrigin: 'top center',
          transform: `scaleY(${blinkScale})`,
          transition: `transform ${blinkDuration} ease-in-out`,
          willChange: 'transform',
        }}
      />
      {/* Lower eyelid — rises from bottom ~30% to meet the upper */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: 0,
          height: '40%',
          zIndex: 8,
          background: 'linear-gradient(to top, #1a0f0d 85%, transparent 100%)',
          transformOrigin: 'bottom center',
          transform: `scaleY(${blinkScale})`,
          transition: `transform ${blinkDuration} ease-in-out`,
          willChange: 'transform',
        }}
      />

      {/* Transparent header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-8 h-16">
        <span
          className="select-none"
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          Lucy
        </span>
      </header>

      {/* Main stage — orb sits precisely on the pupil */}
      <main
        className="relative flex-1 flex flex-col items-center justify-center"
        style={{ zIndex: 10 }}
      >
        <Orb
          state={state}
          onClick={toggleRecording}
          isSessionActive={isSessionActive}
          micVolume={micVolume}
        />

        <div className="h-7 mt-2 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {statusLabel && (
              <motion.span
                key={statusLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="select-none"
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.62)',
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

        <Transcript messages={messages} />
      </main>

      <footer className="fixed bottom-0 right-0 pb-5 pr-8 z-50 pointer-events-none">
        <span
          className="select-none"
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.32)',
            fontFamily: "'Inter', system-ui, sans-serif",
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          Latency: &lt;300ms&nbsp;&nbsp;|&nbsp;&nbsp;Subscribed
        </span>
      </footer>
    </div>
  );
}
