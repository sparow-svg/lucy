import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useCallback, useEffect } from "react";
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

interface Conversation {
  id: number;
  title: string;
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
  const [activeConvId, setActiveConvId] = useState<number | null>(null);

  // Restore session on mount
  useEffect(() => {
    if (!isLoading && user) {
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

  useEffect(() => {
    if (screen === "assistant") {
      fetchConversations();
    }
  }, [screen, fetchConversations]);

  const handleAuthSuccess = useCallback(() => {
    setAuthModal({ open: false, tab: "signup" });
    setScreen("assistant");
  }, []);

  const handleSignOut = useCallback(async () => {
    await logout();
    setScreen("landing");
    setConversations([]);
    setActiveConvId(null);
  }, [logout]);

  const handleNewConversation = useCallback(() => {
    setActiveConvId(null);
    setConversations(prev => prev);
  }, []);

  const handleConvCreated = useCallback((conv: Conversation) => {
    setConversations(prev => {
      const exists = prev.find(c => c.id === conv.id);
      if (exists) return prev;
      return [conv, ...prev];
    });
    setActiveConvId(conv.id);
  }, []);

  const handleSelectConv = useCallback((id: number) => {
    setActiveConvId(id);
  }, []);

  const handleDeleteConv = useCallback(async (id: number) => {
    try {
      await fetch(`/api/openai/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
      }
    } catch { /* ignore */ }
  }, [activeConvId]);

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
            activeConvId={activeConvId}
            onSelect={handleSelectConv}
            onNew={handleNewConversation}
            onDelete={handleDeleteConv}
            firstName={user.firstName}
            onSignOut={handleSignOut}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        <Home
          key={activeConvId ?? "new"}
          firstName={user.firstName}
          conversationId={activeConvId}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onConvCreated={handleConvCreated}
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
