import { useAssistant } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { Transcript } from "@/components/Transcript";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2, Volume2 } from "lucide-react";

export default function Home() {
  const { state, messages, toggleRecording } = useAssistant();

  const getStatusText = () => {
    switch (state) {
      case 'idle': return "Tap to speak";
      case 'listening': return "Listening...";
      case 'thinking': return "Thinking...";
      case 'speaking': return "Speaking...";
      default: return "";
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'idle': return <Mic className="w-3.5 h-3.5" />;
      case 'listening': return <Square className="w-3.5 h-3.5 fill-current" />;
      case 'thinking': return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
      case 'speaking': return <Volume2 className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-background overflow-hidden relative selection:bg-foreground selection:text-background">
      
      {/* Subtle background noise texture */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.015] pointer-events-none mix-blend-multiply"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      />

      {/* Header */}
      <header className="w-full flex justify-center pt-12 pb-4 z-10">
        <h1 className="text-[10px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">
          Chief of Staff
        </h1>
      </header>

      {/* Center UI */}
      <div className="flex-1 flex flex-col items-center justify-center w-full z-10 -mt-16">
        
        <Orb state={state} onClick={toggleRecording} />
        
        {/* Status Indicator */}
        <div className="mt-12 h-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 text-xs font-medium tracking-widest text-muted-foreground uppercase"
            >
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <Transcript messages={messages} />
        
      </div>
      
    </main>
  );
}
