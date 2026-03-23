import { useState, useEffect, useCallback } from "react";

interface Task {
  id: number;
  text: string;
  completed: boolean;
  createdAt: string;
}

export function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { credentials: "include" });
      if (res.ok) setTasks(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: newText.trim() }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks(prev => [...prev, task]);
        setNewText("");
      }
    } catch { /* ignore */ }
    setIsAdding(false);
  };

  const toggleTask = async (id: number, completed: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ completed }),
    }).catch(() => { fetchTasks(); });
  };

  const deleteTask = async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/tasks/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => { fetchTasks(); });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      {/* Add task form */}
      <form onSubmit={addTask} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Add a task…"
            style={{
              flex: 1,
              padding: "7px 10px",
              fontSize: 13,
              fontFamily: "'Inter', system-ui, sans-serif",
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 6,
              color: "#fff",
              outline: "none",
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            disabled={!newText.trim() || isAdding}
            style={{
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              color: "#fff",
              backgroundColor: "#0A84FF",
              border: "none",
              borderRadius: 6,
              cursor: newText.trim() && !isAdding ? "pointer" : "not-allowed",
              opacity: !newText.trim() || isAdding ? 0.45 : 1,
              flexShrink: 0,
            }}
          >
            Add
          </button>
        </div>
      </form>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {tasks.length === 0 ? (
          <p style={{
            padding: "16px",
            fontSize: 12,
            color: "rgba(255,255,255,0.28)",
            fontFamily: "'Inter', system-ui, sans-serif",
            margin: 0,
          }}>
            No tasks yet. Add one above.
          </p>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 16px",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id, !task.completed)}
                style={{
                  flexShrink: 0,
                  width: 16,
                  height: 16,
                  marginTop: 2,
                  borderRadius: 4,
                  border: task.completed
                    ? "none"
                    : "1.5px solid rgba(255,255,255,0.30)",
                  backgroundColor: task.completed ? "#0A84FF" : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                {task.completed && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Text */}
              <span style={{
                flex: 1,
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: task.completed ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.80)",
                textDecoration: task.completed ? "line-through" : "none",
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}>
                {task.text}
              </span>

              {/* Delete */}
              <button
                onClick={() => deleteTask(task.id)}
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                  width: 18,
                  height: 18,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  color: "rgba(255,255,255,0.35)",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                onFocus={e => (e.currentTarget.style.opacity = "1")}
                onBlur={e => (e.currentTarget.style.opacity = "0")}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
