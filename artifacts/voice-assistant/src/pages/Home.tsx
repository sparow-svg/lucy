import { useAssistant } from "@/hooks/use-assistant";
import { Orb } from "@/components/Orb";
import { Transcript } from "@/components/Transcript";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";

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

const CALENDAR_KEYWORDS = [
  'calendar', 'schedule', 'meeting', 'appointment', 'event', 'remind',
  'deadline', 'due date', 'book', 'booking', 'availability', 'slot',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'next week', 'tomorrow', 'this week', 'upcoming',
];

function hasCalendarMention(text: string): boolean {
  const lower = text.toLowerCase();
  return CALENDAR_KEYWORDS.some(kw => lower.includes(kw));
}

interface CalendarService {
  id: 'google' | 'outlook';
  label: string;
  icon: React.ReactNode;
}

const CALENDAR_SERVICES: CalendarService[] = [
  {
    id: 'google',
    label: 'Google Calendar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2" fill="#4285F4" opacity="0.15"/>
        <path d="M6 2V4M12 2V4M2 7H16" stroke="#4285F4" strokeWidth="1.4" strokeLinecap="round"/>
        <text x="9" y="14" textAnchor="middle" fontSize="6" fill="#4285F4" fontWeight="700">31</text>
      </svg>
    ),
  },
  {
    id: 'outlook',
    label: 'Outlook Calendar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2" fill="#0078D4" opacity="0.15"/>
        <path d="M6 2V4M12 2V4M2 7H16" stroke="#0078D4" strokeWidth="1.4" strokeLinecap="round"/>
        <text x="9" y="14" textAnchor="middle" fontSize="6" fill="#0078D4" fontWeight="700">31</text>
      </svg>
    ),
  },
];

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
  const [profileSection, setProfileSection] = useState<'main' | 'calendar'>('main');

  // Calendar connections (persisted in localStorage)
  const [connected, setConnected] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('lucy_calendar_connected') || '{}'); } catch { return {}; }
  });
  const [connecting, setConnecting] = useState<string | null>(null);

  // Calendar banner
  const [calendarBanner, setCalendarBanner] = useState(false);
  const bannerDismissedRef = useRef(false);
  const lastBannerCheckRef = useRef(0);

  useEffect(() => {
    if (state !== 'thinking') return;
    const iv = setInterval(() => setFillerIdx(i => (i + 1) % THINKING_FILLERS.length), 1800);
    return () => clearInterval(iv);
  }, [state]);

  // Calendar keyword detection in Lucy's messages
  useEffect(() => {
    if (bannerDismissedRef.current) return;
    const anyConnected = Object.values(connected).some(Boolean);
    if (anyConnected) return;
    const now = Date.now();
    if (now - lastBannerCheckRef.current < 3000) return;
    lastBannerCheckRef.current = now;
    const recent = messages.filter(m => m.role === 'assistant').slice(-3);
    const triggered = recent.some(m => hasCalendarMention(m.content));
    if (triggered) setCalendarBanner(true);
  }, [messages, connected]);

  const persistConnected = useCallback((next: Record<string, boolean>) => {
    setConnected(next);
    localStorage.setItem('lucy_calendar_connected', JSON.stringify(next));
  }, []);

  const handleConnect = (id: string) => {
    setConnecting(id);
    // Simulate OAuth flow (coming soon)
    setTimeout(() => {
      persistConnected({ ...connected, [id]: true });
      setConnecting(null);
    }, 1500);
  };

  const handleDisconnect = (id: string) => {
    const next = { ...connected };
    delete next[id];
    persistConnected(next);
  };

  const openCalendarPanel = () => {
    setCalendarBanner(false);
    bannerDismissedRef.current = true;
    setProfileSection('calendar');
    setShowProfile(true);
  };

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
              onClick={() => { setShowProfile(s => !s); setProfileSection('main'); }}
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
                    {profileSection === 'main' ? (
                      <ProfileMain
                        firstName={firstName}
                        connected={connected}
                        nudges={nudges}
                        onOpenCalendar={() => setProfileSection('calendar')}
                        onDismissNudge={(id) => onDismissNudge?.(id)}
                        onSignOut={() => { setShowProfile(false); onSignOut?.(); }}
                      />
                    ) : (
                      <CalendarSection
                        connected={connected}
                        connecting={connecting}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onBack={() => setProfileSection('main')}
                      />
                    )}
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

      {/* Transcript */}
      <div style={{
        position: 'fixed',
        bottom: 80, left: 0, right: 0,
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <Transcript messages={messages} />
      </div>

      {/* Calendar connect banner */}
      <AnimatePresence>
        {calendarBanner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              bottom: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 14,
              padding: '10px 14px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              maxWidth: 360,
              width: 'calc(100vw - 80px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
              <rect x="2" y="2" width="14" height="14" rx="2.5" fill="#0A84FF" opacity="0.15"/>
              <path d="M6 2V4.5M12 2V4.5M2 7H16" stroke="#0A84FF" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="12" r="2" fill="#0A84FF" opacity="0.7"/>
            </svg>
            <span style={{
              flex: 1, fontSize: 13, lineHeight: 1.4,
              color: '#222', fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              Connect your calendar to automatically track your events.
            </span>
            <button
              onClick={openCalendarPanel}
              style={{
                flexShrink: 0, fontSize: 12, fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: '#0A84FF', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, whiteSpace: 'nowrap',
              }}
            >
              Connect
            </button>
            <button
              onClick={() => { setCalendarBanner(false); bannerDismissedRef.current = true; }}
              style={{
                flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                color: '#bbb', padding: 0, display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#666')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#bbb')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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

// ── Profile panel — main view ────────────────────────────────────────────────
function ProfileMain({
  firstName,
  connected,
  nudges,
  onOpenCalendar,
  onDismissNudge,
  onSignOut,
}: {
  firstName: string;
  connected: Record<string, boolean>;
  nudges: Array<{ id: number; text: string; dueAt: string | null }>;
  onOpenCalendar: () => void;
  onDismissNudge: (id: number) => void;
  onSignOut: () => void;
}) {
  const connectedCount = Object.values(connected).filter(Boolean).length;
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

      {/* Connected services row */}
      <button
        onClick={onOpenCalendar}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 16px", background: "none", border: "none", cursor: "pointer",
          borderBottom: "1px solid #f0f0f0",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f8f8f8")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="#888" strokeWidth="1.3"/>
            <path d="M5 1V3.5M11 1V3.5M1.5 6H14.5" stroke="#888" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 13, color: "#333", fontFamily: "'Inter', system-ui, sans-serif" }}>
            Connected services
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {connectedCount > 0 ? (
            <span style={{
              fontSize: 11, color: "#fff", backgroundColor: "#0A84FF",
              borderRadius: 10, padding: "1px 7px",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}>
              {connectedCount}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: "#bbb", fontFamily: "'Inter', system-ui, sans-serif" }}>
              Coming soon
            </span>
          )}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 2L7 5L3 8" stroke="#bbb" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

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

// ── Profile panel — calendar section ────────────────────────────────────────
function CalendarSection({
  connected,
  connecting,
  onConnect,
  onDisconnect,
  onBack,
}: {
  connected: Record<string, boolean>;
  connecting: string | null;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px", borderBottom: "1px solid #f0f0f0",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: 4, display: "flex", alignItems: "center",
            color: "#aaa", borderRadius: 4,
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#333")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#aaa")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111", fontFamily: "'Inter', system-ui, sans-serif" }}>
          Connected services
        </span>
      </div>

      {/* Services */}
      <div style={{ padding: "8px 0" }}>
        {CALENDAR_SERVICES.map(svc => {
          const isConnected = connected[svc.id];
          const isConnecting = connecting === svc.id;
          return (
            <div
              key={svc.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {svc.icon}
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: "#222", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500 }}>
                    {svc.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: isConnected ? "#22c55e" : "#aaa", fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {isConnected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => isConnected ? onDisconnect(svc.id) : onConnect(svc.id)}
                disabled={isConnecting}
                style={{
                  fontSize: 12, fontWeight: 600,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  padding: "5px 12px",
                  borderRadius: 9999,
                  border: isConnected ? "1.5px solid #e0e0e0" : "none",
                  cursor: isConnecting ? "wait" : "pointer",
                  color: isConnected ? "#888" : "#fff",
                  backgroundColor: isConnecting ? "#bbb" : isConnected ? "transparent" : "#0A84FF",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  if (!isConnecting && !isConnected)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0071EB";
                }}
                onMouseLeave={e => {
                  if (!isConnecting && !isConnected)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0A84FF";
                }}
              >
                {isConnecting ? "Connecting…" : isConnected ? "Disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div style={{ padding: "0 16px 14px" }}>
        <p style={{
          margin: 0, fontSize: 11, color: "#bbb", lineHeight: 1.5,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          Once connected, Lucy can reference your events and remind you of upcoming appointments naturally in conversation.
        </p>
      </div>
    </div>
  );
}
