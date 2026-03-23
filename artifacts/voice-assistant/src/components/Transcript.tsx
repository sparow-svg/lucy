import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/hooks/use-assistant";
import { cn } from "@/lib/utils";

interface TranscriptProps {
  messages: ChatMessage[];
}

export function Transcript({ messages }: TranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-md mx-auto mt-12 max-h-[30vh] overflow-y-auto scroll-smooth pb-8 px-4"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 80%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 80%, transparent)'
      }}
    >
      <div className="flex flex-col gap-6 py-12">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            
            // Skip empty assistant messages that haven't streamed yet
            if (!msg.content && !isUser) return null;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={cn(
                  "flex w-full",
                  isUser ? "justify-end" : "justify-center"
                )}
              >
                <div 
                  className={cn(
                    "max-w-[85%] text-[13px] leading-relaxed tracking-wide",
                    isUser 
                      ? "text-muted-foreground text-right" 
                      : "text-foreground text-center font-medium"
                  )}
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
}
