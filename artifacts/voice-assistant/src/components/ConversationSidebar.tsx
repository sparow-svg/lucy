import { useState } from "react";
import { TasksPanel } from "./TasksPanel";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConvId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  firstName: string;
  onSignOut: () => void;
  onClose: () => void;
}

type SidebarTab = "conversations" | "tasks";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  conversations,
  activeConvId,
  onSelect,
  onNew,
  onDelete,
  firstName,
  onSignOut,
  onClose,
}: ConversationSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>("conversations");
  const [showSignOut, setShowSignOut] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: 260,
      height: "100vh",
      zIndex: 40,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "rgba(10,10,14,0.90)",
      backdropFilter: "blur(16px)",
      borderRight: "1px solid rgba(255,255,255,0.07)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 56,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: "rgba(255,255,255,0.90)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>Lucy</span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* User name + sign out */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowSignOut(s => !s)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: 12,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "rgba(255,255,255,0.50)",
                borderRadius: 6,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {firstName}
            </button>
            {showSignOut && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  width: 120,
                  backgroundColor: "rgba(22,22,28,0.98)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  overflow: "hidden",
                  zIndex: 100,
                }}
              >
                <button
                  onClick={() => { setShowSignOut(false); onSignOut(); }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    fontSize: 13,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    color: "rgba(255,255,255,0.75)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Close sidebar */}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M3 4H13M3 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        padding: "10px 12px 0",
        gap: 4,
        flexShrink: 0,
      }}>
        {(["conversations", "tasks"] as SidebarTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 12,
              fontWeight: 500,
              fontFamily: "'Inter', system-ui, sans-serif",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              transition: "all 0.15s",
              backgroundColor: tab === t ? "rgba(255,255,255,0.09)" : "transparent",
              color: tab === t ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.40)",
            }}
          >
            {t === "conversations" ? "Conversations" : "Tasks"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "conversations" ? (
          <>
            {/* New conversation button */}
            <div style={{ padding: "10px 12px 6px" }}>
              <button
                onClick={onNew}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: "rgba(255,255,255,0.80)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.10)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.06)";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                New conversation
              </button>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 16px" }}>
              {conversations.length === 0 ? (
                <p style={{
                  padding: "12px 16px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  margin: 0,
                }}>
                  No conversations yet.
                </p>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => onSelect(conv.id)}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0,
                      padding: "0 8px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      flex: 1,
                      padding: "9px 8px",
                      borderRadius: 8,
                      backgroundColor: conv.id === activeConvId
                        ? "rgba(255,255,255,0.09)"
                        : hoveredId === conv.id
                          ? "rgba(255,255,255,0.05)"
                          : "transparent",
                      transition: "background-color 0.1s",
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          fontSize: 13,
                          fontFamily: "'Inter', system-ui, sans-serif",
                          color: "rgba(255,255,255,0.80)",
                          fontWeight: conv.id === activeConvId ? 500 : 400,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {conv.title}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: 11,
                          color: "rgba(255,255,255,0.28)",
                          fontFamily: "'Inter', system-ui, sans-serif",
                          marginTop: 1,
                        }}>
                          {timeAgo(conv.createdAt)}
                        </p>
                      </div>

                      {hoveredId === conv.id && (
                        <button
                          onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                          style={{
                            flexShrink: 0,
                            width: 22,
                            height: 22,
                            border: "none",
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: 4,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "rgba(255,255,255,0.45)",
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,80,80,0.15)";
                            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,100,100,0.8)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.06)";
                            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <TasksPanel />
        )}
      </div>
    </div>
  );
}
