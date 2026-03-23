import { useAssistant } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { Transcript } from "@/components/Transcript";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { state, messages, isSessionActive, micVolume, toggleRecording } = useAssistant();

  const getStatusLabel = () => {
    switch (state) {
      case 'dormant': return "say \"Lucy\" to start";
      case 'idle': return null;
      case 'listening': return "listening";
      case 'thinking': return "thinking";
      case 'speaking': return null;
    }
  };

  const label = getStatusLabel();

  return (
    <div className="min-h-screen w-full bg-white flex flex-col relative overflow-hidden">

      {/* Fixed header — no borders, no background */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-8 h-16">
        <span
          className="text-black select-none"
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
          }}
        >
          Lucy
        </span>
      </header>

      {/* Main stage — vertically and horizontally centered */}
      <main
        className="flex-1 flex flex-col items-center justify-center"
        style={{ paddingTop: 64 }}
      >
        <Orb
          state={state}
          onClick={toggleRecording}
          isSessionActive={isSessionActive}
          micVolume={micVolume}
        />

        {/* Subtle status label */}
        <div className="h-7 mt-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {label && (
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="select-none"
                style={{
                  fontSize: 12,
                  color: '#9CA3AF',
                  letterSpacing: '0.06em',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <Transcript messages={messages} />
      </main>

      {/* Footer — pure text, no borders */}
      <footer className="fixed bottom-0 right-0 pb-5 pr-8 z-50 pointer-events-none">
        <span
          className="select-none"
          style={{
            fontSize: 11,
            color: '#D1D5DB',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          Latency: &lt;300ms&nbsp;&nbsp;|&nbsp;&nbsp;Subscribed
        </span>
      </footer>

    </div>
  );
}
