import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useCallback, useEffect, useRef } from "react";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { ConversationSidebar } from "@/components/ConversationSidebar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

type AppScreen = "landing" | "assistant";
type AuthModalTab = "signin" | "signup";

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

export interface Memory {
  id: number;
  text: string;
  createdAt: string;
}

export interface Nudge {
  id: number;
  text: string;
  dueAt: string | null;
  dismissed: boolean;
  createdAt: string;
}

function AppContent() {
  const { user, isLoading, logout } = useAuth();
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: AuthModalTab }>({
    open: false,
    tab: "signup",
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [nudgesList, setNudgesList] = useState<Nudge[]>([]);

  // homeKey controls when Home remounts — only change on explicit user actions
  const [homeKey, setHomeKey] = useState(0);
  // The conversation passed INTO Home — null = create fresh; a number = load existing
  const [homeConvId, setHomeConvId] = useState<number | null>(null);
  // The highlighted conv in the sidebar (for UI state only)
  const [sidebarActiveId, setSidebarActiveId] = useState<number | null>(null);

  const hasRestoredSession = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (!isLoading && user && !hasRestoredSession.current) {
      hasRestoredSession.current = true;
      setScreen("assistant");
    }
  }, [isLoading, user]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/openai/conversations", { credentials: "include" });
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/memories", { credentials: "include" });
      if (res.ok) {
        const data: Memory[] = await res.json();
        setMemories(data);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchNudges = useCallback(async () => {
    try {
      const res = await fetch("/api/nudges", { credentials: "include" });
      if (res.ok) {
        const data: Nudge[] = await res.json();
        setNudgesList(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (screen === "assistant") {
      fetchConversations();
      fetchMemories();
      fetchNudges();
    }
  }, [screen, fetchConversations, fetchMemories, fetchNudges]);

  const handleAuthSuccess = useCallback(() => {
    setAuthModal({ open: false, tab: "signup" });
    setScreen("assistant");
  }, []);

  const handleSignOut = useCallback(async () => {
    await logout();
    setScreen("landing");
    setConversations([]);
    setMemories([]);
    setNudgesList([]);
    setSidebarActiveId(null);
    setHomeConvId(null);
    setHomeKey(k => k + 1);
  }, [logout]);

  // Called when Home internally creates a conversation — just add to list, NO remount
  const handleConvCreated = useCallback((conv: Conversation) => {
    setConversations(prev => {
      const exists = prev.find(c => c.id === conv.id);
      if (exists) return prev;
      return [conv, ...prev];
    });
    setSidebarActiveId(conv.id);
    // Do NOT change homeKey — that would remount Home and cause a second greeting
  }, []);

  // User explicitly selects a conversation from the sidebar → remount Home with that conv
  const handleSelectConv = useCallback((id: number) => {
    setSidebarActiveId(id);
    setHomeConvId(id);
    setHomeKey(k => k + 1);
  }, []);

  // User clicks "New conversation" in sidebar → remount Home fresh
  const handleNewConversation = useCallback(() => {
    setSidebarActiveId(null);
    setHomeConvId(null);
    setHomeKey(k => k + 1);
  }, []);

  const handleDeleteConv = useCallback(async (id: number) => {
    try {
      await fetch(`/api/openai/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (sidebarActiveId === id) {
        setSidebarActiveId(null);
        setHomeConvId(null);
        setHomeKey(k => k + 1);
      }
    } catch { /* ignore */ }
  }, [sidebarActiveId]);

  const handleRenameConv = useCallback(async (id: number, title: string) => {
    try {
      const res = await fetch(`/api/openai/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const updated: Conversation = await res.json();
        setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
      }
    } catch { /* ignore */ }
  }, []);

  const handleAddMemory = useCallback(async (text: string) => {
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const mem: Memory = await res.json();
        setMemories(prev => [...prev, mem]);
      }
    } catch { /* ignore */ }
  }, []);

  const handleDeleteMemory = useCallback(async (id: number) => {
    try {
      await fetch(`/api/memories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch { /* ignore */ }
  }, []);

  const handleAddNudge = useCallback(async (text: string, dueAt?: string) => {
    try {
      const res = await fetch("/api/nudges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text, dueAt: dueAt || undefined }),
      });
      if (res.ok) {
        const nudge: Nudge = await res.json();
        setNudgesList(prev => [...prev, nudge]);
      }
    } catch { /* ignore */ }
  }, []);

  const handleDismissNudge = useCallback(async (id: number) => {
    try {
      await fetch(`/api/nudges/${id}/dismiss`, {
        method: "PATCH",
        credentials: "include",
      });
      setNudgesList(prev => prev.filter(n => n.id !== id));
    } catch { /* ignore */ }
  }, []);

  if (isLoading) {
    return (
      <div style={{
        position: "fixed", inset: 0, backgroundColor: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontSize: 17, fontWeight: 600, letterSpacing: "-0.03em",
          color: "rgba(255,255,255,0.30)", fontFamily: "'Inter', system-ui, sans-serif",
        }}>Lucy</span>
      </div>
    );
  }

  if (screen === "assistant" && user) {
    return (
      <>
        {sidebarOpen && (
          <ConversationSidebar
            conversations={conversations}
            memories={memories}
            nudges={nudgesList}
            activeConvId={sidebarActiveId}
            onSelect={handleSelectConv}
            onNew={handleNewConversation}
            onDelete={handleDeleteConv}
            onRename={handleRenameConv}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
            onAddNudge={handleAddNudge}
            onDismissNudge={handleDismissNudge}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        <Home
          key={homeKey}
          firstName={user.firstName}
          conversationId={homeConvId}
          sidebarOpen={sidebarOpen}
          nudges={nudgesList}
          onOpenSidebar={() => setSidebarOpen(true)}
          onConvCreated={handleConvCreated}
          onDismissNudge={handleDismissNudge}
          onSignOut={handleSignOut}
        />
      </>
    );
  }

  return (
    <>
      <Landing
        onStart={() => setAuthModal({ open: true, tab: "signup" })}
        onSignIn={() => setAuthModal({ open: true, tab: "signin" })}
      />
      {authModal.open && (
        <AuthModal
          initialTab={authModal.tab}
          onClose={() => setAuthModal(a => ({ ...a, open: false }))}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppContent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
