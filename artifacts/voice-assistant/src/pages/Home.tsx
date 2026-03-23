import { useAssistant } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { Transcript } from "@/components/Transcript";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { state, messages, isSessionActive, startSession, toggleRecording } = useAssistant();

  const handleOrbClick = () => {
    if (!isSessionActive) return;
    toggleRecording();
  };

  const getStatusLabel = () => {
    switch (state) {
      case 'dormant': return null;
      case 'idle': return "tap to speak";
      case 'listening': return "listening";
      case 'thinking': return "thinking";
      case 'speaking': return "speaking";
    }
  };

  const label = getStatusLabel();

  return (
    <div className="min-h-screen w-full bg-white flex flex-col relative overflow-hidden">

      {/* Fixed Header — no border, no bg */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-16">
        {/* LUCY wordmark */}
        <span
          className="text-black font-semibold tracking-tight select-none"
          style={{ fontSize: 16, letterSpacing: '-0.01em', fontFamily: "'Geist', 'Inter', sans-serif" }}
        >
          LUCY
        </span>

        {/* Start button — only visible when dormant */}
        <AnimatePresence>
          {!isSessionActive && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              onClick={startSession}
              className="flex items-center justify-center text-white font-bold select-none focus:outline-none"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                fontSize: 12,
                background: 'linear-gradient(135deg, #4facfe 0%, #3b82f6 40%, #6366f1 100%)',
                boxShadow: '0 4px 16px rgba(59,130,246,0.35), 0 1px 3px rgba(0,0,0,0.12)',
                letterSpacing: '0.01em',
              }}
              whileHover={{ scale: 1.06, boxShadow: '0 6px 20px rgba(59,130,246,0.45)' }}
              whileTap={{ scale: 0.94 }}
            >
              Start
            </motion.button>
          )}
        </AnimatePresence>

        {/* End button — visible once session active */}
        <AnimatePresence>
          {isSessionActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-[#9CA3AF] select-none"
              style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
            >
              {state === 'listening' ? '● recording' : state === 'speaking' ? '● speaking' : ''}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Stage — full height, orb only */}
      <main className="flex-1 flex flex-col items-center justify-center">

        {/* The Orb — sole focus of the center stage */}
        <Orb
          state={state}
          onClick={handleOrbClick}
          isSessionActive={isSessionActive}
        />

        {/* Status label — tiny, secondary, below orb */}
        <div className="h-6 mt-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {label && (
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.18 }}
                className="text-[11px] text-[#9CA3AF] tracking-widest uppercase select-none"
                style={{ fontFamily: "'Geist', 'Inter', sans-serif", letterSpacing: '0.12em' }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Transcript */}
        <Transcript messages={messages} />

      </main>

      {/* Footer — pure text, bottom-right, no borders */}
      <footer className="fixed bottom-0 right-0 pb-5 pr-8 z-50 pointer-events-none">
        <span
          className="text-[#9CA3AF] select-none"
          style={{ fontSize: 11, fontFamily: "'Geist', 'Inter', sans-serif" }}
        >
          Latency: &lt;300ms&nbsp;&nbsp;|&nbsp;&nbsp;Subscribed
        </span>
      </footer>

    </div>
  );
}
