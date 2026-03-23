import { useState, useRef, useEffect } from "react";
import { TasksPanel } from "./TasksPanel";
import type { Conversation, Memory } from "@/App";

interface ConversationSidebarProps {
  conversations: Conversation[];
  memories: Memory[];
  activeConvId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  onRename: (id: number, title: string) => void;
  onAddMemory: (text: string) => void;
  onDeleteMemory: (id: number) => void;
  onClose: () => void;
}

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

function ConvItem({
  conv,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conv.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(conv.title);
      setTimeout(() => inputRef.current?.select(), 30);
    }
  }, [editing, conv.title]);

  const commitRename = () => {
    const val = editValue.trim();
    if (val && val !== conv.title) onRename(val);
    setEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "0 8px",
        margin: "1px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "7px 8px",
          borderRadius: 8,
          backgroundColor: isActive ? "rgba(0,0,0,0.07)" : hovered ? "rgba(0,0,0,0.04)" : "transparent",
          transition: "background-color 0.1s",
          cursor: editing ? "default" : "pointer",
        }}
        onClick={() => { if (!editing) onSelect(); }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%",
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#111",
                border: "none",
                borderBottom: "1.5px solid #0A84FF",
                outline: "none",
                background: "transparent",
                padding: "1px 0",
              }}
            />
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#222",
                fontWeight: isActive ? 500 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
            >
              {conv.title}
            </p>
          )}
          {!editing && (
            <p style={{
              margin: 0,
              fontSize: 11,
              color: "#999",
              fontFamily: "'Inter', system-ui, sans-serif",
              marginTop: 1,
            }}>
              {timeAgo(conv.createdAt)}
            </p>
          )}
        </div>

        {hovered && !editing && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            <button
              title="Rename"
              onClick={e => { e.stopPropagation(); setEditing(true); }}
              style={{
                width: 20, height: 20, border: "none", background: "rgba(0,0,0,0.07)",
                borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#666",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.07)")}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M7 1.5L8.5 3 3.5 8H2V6.5L7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              title="Delete"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{
                width: 20, height: 20, border: "none", background: "rgba(0,0,0,0.07)",
                borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#999",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,50,50,0.12)";
                (e.currentTarget as HTMLButtonElement).style.color = "#cc3333";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)";
                (e.currentTarget as HTMLButtonElement).style.color = "#999";
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryPanel({
  memories,
  onAdd,
  onDelete,
}: {
  memories: Memory[];
  onAdd: (text: string) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const [newText, setNewText] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const submit = () => {
    const t = newText.trim();
    if (!t) return;
    onAdd(t);
    setNewText("");
  };

  return (
    <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: 6 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px 8px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Lucy remembers…
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ color: "#aaa", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ padding: "0 8px 12px" }}>
          {memories.length === 0 ? (
            <div style={{ marginBottom: 8 }}>
              {[
                "I need to submit the report by Friday.",
                "My favorite coffee is black.",
                "My project deadline is March 28.",
              ].map((example, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    padding: "5px 8px",
                    borderRadius: 6,
                  }}
                >
                  <span style={{
                    fontSize: 11,
                    color: "#ccc",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    flex: 1,
                    lineHeight: 1.5,
                    fontStyle: "italic",
                  }}>
                    {example}
                  </span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "#d0d0d0", fontFamily: "'Inter', system-ui, sans-serif", margin: "4px 8px 0", lineHeight: 1.5, fontStyle: "italic" }}>
                Add things Lucy should remember across all conversations.
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: 8 }}>
              {memories.map(m => (
                <div
                  key={m.id}
                  onMouseEnter={() => setHoveredId(m.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    padding: "5px 8px",
                    borderRadius: 6,
                    backgroundColor: hoveredId === m.id ? "rgba(0,0,0,0.04)" : "transparent",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#666", fontFamily: "'Inter', system-ui, sans-serif", flex: 1, lineHeight: 1.5 }}>
                    {m.text}
                  </span>
                  {hoveredId === m.id && (
                    <button
                      onClick={() => onDelete(m.id)}
                      style={{
                        flexShrink: 0, width: 16, height: 16, border: "none", background: "none",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#ccc", padding: 0, marginTop: 2,
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#cc3333")}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#ccc")}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, padding: "0 0 0 0" }}>
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              placeholder="Add a memory…"
              style={{
                flex: 1,
                fontSize: 12,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: "#333",
                border: "1.5px solid #e8e8e8",
                borderRadius: 7,
                padding: "7px 10px",
                outline: "none",
                backgroundColor: "#fafafa",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "#0A84FF")}
              onBlur={e => (e.currentTarget.style.borderColor = "#e8e8e8")}
            />
            <button
              onClick={submit}
              disabled={!newText.trim()}
              style={{
                flexShrink: 0,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif",
                backgroundColor: newText.trim() ? "#0A84FF" : "#e0e0e0",
                color: newText.trim() ? "#fff" : "#aaa",
                border: "none",
                borderRadius: 7,
                cursor: newText.trim() ? "pointer" : "not-allowed",
                transition: "background-color 0.15s",
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  memories,
  activeConvId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onAddMemory,
  onDeleteMemory,
  onClose,
}: ConversationSidebarProps) {
  const [tasksOpen, setTasksOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: 16,
        transform: "translateY(-50%)",
        width: 220,
        maxHeight: "54vh",
        minHeight: 120,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.5) inset",
        overflow: "hidden",
      }}
    >
      {/* Header — close button only, no logo, no name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px 8px",
          flexShrink: 0,
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <button
          onClick={onNew}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "'Inter', system-ui, sans-serif",
            color: "#444",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "3px 6px",
            borderRadius: 6,
            transition: "background 0.12s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "none")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          New
        </button>

        <button
          onClick={onClose}
          title="Collapse sidebar"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            color: "#bbb",
            borderRadius: 5,
            transition: "color 0.12s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#555")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#bbb")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7H12M2 3.5H12M2 10.5H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
        {/* Conversations */}
        <div style={{ padding: "8px 0 4px" }}>
          {conversations.length === 0 ? (
            <p style={{
              padding: "6px 16px",
              fontSize: 12,
              color: "#bbb",
              fontFamily: "'Inter', system-ui, sans-serif",
              margin: 0,
              lineHeight: 1.5,
            }}>
              No conversations yet.
            </p>
          ) : (
            conversations.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                onSelect={() => onSelect(conv.id)}
                onDelete={() => onDelete(conv.id)}
                onRename={title => onRename(conv.id, title)}
              />
            ))
          )}
        </div>

        {/* Tasks section */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", marginTop: 2 }}>
          <button
            onClick={() => setTasksOpen(o => !o)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Tasks
            </span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ color: "#aaa", transform: tasksOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {tasksOpen && (
            <div style={{ padding: "0 8px 12px" }}>
              <TasksPanel compact />
            </div>
          )}
        </div>

        {/* Memory panel */}
        <MemoryPanel
          memories={memories}
          onAdd={onAddMemory}
          onDelete={onDeleteMemory}
        />
      </div>
    </div>
  );
}
