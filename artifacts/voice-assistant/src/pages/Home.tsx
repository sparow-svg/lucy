import { useAssistant } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { Transcript } from "@/components/Transcript";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// Micro-fillers rotate during thinking to feel alive
const THINKING_FILLERS = ["Hmm…", "Got it…", "Right…", "Let me think…", "Sure…"];

export default function Home() {
  const { state, messages, micVolume, isSessionActive, toggleRecording } = useAssistant();
  const [fillerIdx, setFillerIdx] = useState(0);

  // Rotate filler text every 1.8s while thinking
  useEffect(() => {
    if (state !== 'thinking') return;
    const iv = setInterval(() => {
      setFillerIdx(i => (i + 1) % THINKING_FILLERS.length);
    }, 1800);
    return () => clearInterval(iv);
  }, [state]);

  const statusLabel =
    state === 'dormant'   ? 'say "Lucy" to start' :
    state === 'listening' ? 'listening…' :
    state === 'thinking'  ? THINKING_FILLERS[fillerIdx] :
    null;

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden">

      {/*
        Eye image — <img> with object-fit:cover + object-position to pin the
        pupil (approx 44% from left, 51% from top in the source image)
        exactly at screen center so the orb sits precisely on it.
      */}
      <img
        src="/bg-eye.jpeg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{
          objectFit: 'cover',
          objectPosition: '44% 51%',
          zIndex: 0,
        }}
      />

      {/* Very subtle vignette — just enough to make the Lucy text legible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.18) 100%)',
        }}
      />

      {/* Header — fully transparent, text sits directly on the image */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-8 h-16">
        <span
          className="select-none"
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 4px rgba(0,0,0,0.35)',
          }}
        >
          Lucy
        </span>
      </header>

      {/* Main stage — orb centered on pupil */}
      <main
        className="relative flex-1 flex flex-col items-center justify-center"
        style={{ zIndex: 10, paddingTop: 64 }}
      >
        <Orb
          state={state}
          onClick={toggleRecording}
          isSessionActive={isSessionActive}
          micVolume={micVolume}
        />

        {/* Status / micro-filler */}
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

      {/* Footer */}
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
