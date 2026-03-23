import { useAssistant } from "@/hooks/use-assistant";
import type { ChatMessage } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";

const THINKING_FILLERS = ["Hmm…", "Got it…", "Right…", "Let me think…", "Sure…"];

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


interface HomeProps {
  firstName?: string;
  conversationId?: number | null;
  sidebarOpen?: boolean;
  nudges?: Array<{ id: number; text: string; dueAt: string | null }>;
  onOpenSidebar?: () => void;
  onConvCreated?: (conv: { id: number; title: string; createdAt: string }) => void;
  onDismissNudge?: (id: number) => void;
  onSignOut?: () => void;
}

const STATUS_TOP  = 'calc(50vh + 70px)';
const STATUS_FONT = 10;

export default function Home({
  firstName = "there",
  conversationId = null,
  sidebarOpen = false,
  nudges = [],
  onOpenSidebar,
  onConvCreated,
  onDismissNudge,
  onSignOut,
}: HomeProps) {
  const { state, messages, micVolume, isSessionActive, isPaused, toggleRecording } =
    useAssistant(firstName, conversationId, onConvCreated);
  const [fillerIdx, setFillerIdx] = useState(0);
  const blinkPhase = useBlink();

  // Profile panel
  const [showProfile, setShowProfile] = useState(false);

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
      {/* Eye background */}
      <img
        src="/bg-eye.jpeg" alt="" aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 0 }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.20) 100%)',
      }} />

      {/* Upper eyelid */}
      <div aria-hidden className="absolute left-0 right-0 pointer-events-none" style={{
        top: 0, height: '60%', zIndex: 8,
        background: 'linear-gradient(to bottom, #1a0f0d 85%, transparent 100%)',
        transformOrigin: 'top center',
        transform: `scaleY(${blinkScale})`,
        transition: `transform ${blinkDuration} ease-in-out`,
        willChange: 'transform',
      }} />
      {/* Lower eyelid */}
      <div aria-hidden className="absolute left-0 right-0 pointer-events-none" style={{
        bottom: 0, height: '40%', zIndex: 8,
        background: 'linear-gradient(to top, #1a0f0d 85%, transparent 100%)',
        transformOrigin: 'bottom center',
        transform: `scaleY(${blinkScale})`,
        transition: `transform ${blinkDuration} ease-in-out`,
        willChange: 'transform',
      }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 h-14">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!sidebarOpen && (
            <button
              onClick={onOpenSidebar}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: 4, display: "flex", alignItems: "center",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9H15M3 5H15M3 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <span className="select-none" style={{
            fontSize: 16, fontWeight: 600, letterSpacing: '-0.03em',
            fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
            color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}>Lucy</span>
        </div>

        {/* Right: firstName + profile button */}
        {firstName && firstName !== "there" && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowProfile(s => !s)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "4px 10px",
                fontSize: 12, fontWeight: 500,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "rgba(255,255,255,0.55)",
                textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                borderRadius: 6,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span>{firstName}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <AnimatePresence>
              {showProfile && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 98 }}
                    onClick={() => setShowProfile(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute", top: "calc(100% + 8px)", right: 0,
                      width: 240,
                      backgroundColor: "#fff",
                      border: "1px solid #e8e8e8",
                      borderRadius: 14,
                      overflow: "hidden",
                      zIndex: 99,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
                    }}
                  >
                    <ProfileMain
                      firstName={firstName}
                      nudges={nudges}
                      onDismissNudge={(id) => onDismissNudge?.(id)}
                      onSignOut={() => { setShowProfile(false); onSignOut?.(); }}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>

      {/* Orb */}
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

      {/* Status label */}
      <div style={{
        position: 'fixed',
        top: STATUS_TOP, left: 0, right: 0,
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

      {/* Summary panel — voice-first, no live transcript */}
      <SummaryPanel messages={messages} />

      {/* Footer hint */}
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

// ── Conversation Summary Panel ───────────────────────────────────────────────
function SummaryPanel({ messages }: { messages: ChatMessage[] }) {
  const [open, setOpen] = useState(false);

  // Key points = Lucy's responses (non-empty assistant messages), most recent first
  const keyPoints = messages
    .filter(m => m.role === 'assistant' && m.content.trim().length > 10)
    .slice(-6)
    .reverse();

  if (keyPoints.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
      pointerEvents: 'auto',
    }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{
              width: 280,
              maxHeight: 320,
              overflowY: 'auto',
              backgroundColor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
              padding: '12px 14px',
            }}
          >
            <p style={{
              margin: '0 0 10px',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: '#aaa',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Conversation summary
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {keyPoints.map((msg, i) => (
                <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    flexShrink: 0, width: 5, height: 5, marginTop: 5,
                    borderRadius: '50%', backgroundColor: '#0A84FF', opacity: 0.7 - i * 0.08,
                    display: 'inline-block',
                  }} />
                  <span style={{
                    fontSize: 12, lineHeight: 1.5, color: '#333',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}>
                    {msg.content.length > 120
                      ? msg.content.slice(0, 117) + '…'
                      : msg.content}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Hide summary' : 'View conversation summary'}
        style={{
          width: 38, height: 38,
          borderRadius: '50%',
          backgroundColor: open ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.18)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#0A84FF' : 'rgba(255,255,255,0.6)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.backgroundColor = open ? 'rgba(10,132,255,0.22)' : 'rgba(255,255,255,0.28)';
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.backgroundColor = open ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.18)';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4C2 2.9 2.9 2 4 2H12C13.1 2 14 2.9 14 4V9C14 10.1 13.1 11 12 11H9L6 14V11H4C2.9 11 2 10.1 2 9V4Z"
            stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M5 6H11M5 8.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Profile panel — main view ────────────────────────────────────────────────
function ProfileMain({
  firstName,
  nudges,
  onDismissNudge,
  onSignOut,
}: {
  firstName: string;
  nudges: Array<{ id: number; text: string; dueAt: string | null }>;
  onDismissNudge: (id: number) => void;
  onSignOut: () => void;
}) {
  const [hoveredNudge, setHoveredNudge] = useState<number | null>(null);

  return (
    <div>
      {/* User info */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: "1px solid #f0f0f0",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          backgroundColor: "#0A84FF",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
            {firstName[0]?.toUpperCase()}
          </span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#111", fontFamily: "'Inter', system-ui, sans-serif" }}>
            {firstName}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "#aaa", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Lucy account
          </p>
        </div>
      </div>

      {/* Active nudges */}
      {nudges.length > 0 && (
        <div style={{ borderBottom: "1px solid #f0f0f0", padding: "8px 0 4px" }}>
          <p style={{
            margin: "0 16px 6px",
            fontSize: 10, fontWeight: 600, color: "#bbb",
            letterSpacing: "0.07em", textTransform: "uppercase",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Active nudges
          </p>
          {nudges.slice(0, 4).map(n => (
            <div
              key={n.id}
              onMouseEnter={() => setHoveredNudge(n.id)}
              onMouseLeave={() => setHoveredNudge(null)}
              style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                padding: "5px 16px",
                backgroundColor: hoveredNudge === n.id ? "#f8f8f8" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <span style={{
                  fontSize: 12, color: "#333",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  display: "block", lineHeight: 1.45,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {n.text}
                </span>
                {n.dueAt && (
                  <span style={{ fontSize: 10, color: "#0A84FF", fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {new Date(n.dueAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <button
                onClick={() => onDismissNudge(n.id)}
                title="Dismiss"
                style={{
                  flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                  padding: 2, color: "#ddd", display: "flex", alignItems: "center",
                  marginTop: 2,
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#cc3333")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#ddd")}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
          {nudges.length > 4 && (
            <p style={{ margin: "4px 16px 2px", fontSize: 11, color: "#bbb", fontFamily: "'Inter', system-ui, sans-serif" }}>
              +{nudges.length - 4} more in sidebar
            </p>
          )}
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={onSignOut}
        style={{
          display: "block", width: "100%", padding: "11px 16px",
          textAlign: "left", fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
          color: "#e53e3e", background: "none", border: "none", cursor: "pointer",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#fff5f5")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        Sign out
      </button>
    </div>
  );
}

