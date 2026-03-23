import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useCallback } from "react";
import Landing from "@/pages/Landing";
import { Onboarding } from "@/components/Onboarding";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

type AppScreen = "landing" | "onboarding" | "assistant";

function AppContent() {
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [firstName, setFirstName] = useState("");

  const handleStart    = useCallback(() => setScreen("onboarding"), []);
  const handleBack     = useCallback(() => setScreen("landing"), []);
  const handleComplete = useCallback((name: string) => {
    setFirstName(name);
    setScreen("assistant");
  }, []);

  if (screen === "assistant") {
    return <Home firstName={firstName} />;
  }

  return (
    <>
      <Landing onStart={handleStart} />
      {screen === "onboarding" && (
        <Onboarding onComplete={handleComplete} onBack={handleBack} />
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
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
