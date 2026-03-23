import { useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/hooks/use-assistant";

interface TranscriptProps {
  messages: ChatMessage[];
}

export const Transcript = memo(function Transcript({ messages }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="w-full max-w-sm mx-auto mt-8 max-h-[28vh] overflow-y-auto scroll-smooth pb-6 px-4"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 80%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 80%, transparent)',
      }}
    >
      <div className="flex flex-col gap-5 py-8">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            if (!msg.content && msg.role === 'assistant') return null;
            const isUser = msg.role === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-center'}`}
              >
                <div
                  style={{
                    maxWidth: '88%',
                    fontSize: 13,
                    lineHeight: 1.55,
                    letterSpacing: '0.01em',
                    color: isUser
                      ? 'rgba(255,255,255,0.55)'
                      : 'rgba(255,255,255,0.9)',
                    textAlign: isUser ? 'right' : 'center',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: isUser ? 400 : 500,
                  }}
                >
                  {msg.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
});
