import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LandingPage from "@/pages/LandingPage";
import { useEffect } from "react";
import { LogsFAB } from "@/components/logs-fab";
import { useWebSocket } from "@/hooks/use-websocket";
import { Helmet } from "react-helmet";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { logs } = useWebSocket();

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="relative min-h-screen w-full overflow-x-hidden">
          <Helmet>
            <title>SignalFlow AI - Automated Forex Trading Bot from Telegram</title>
            <meta name="description" content="Automate your forex trading with AI-powered signal detection. Monitor Telegram channels and execute trades on MetaTrader instantly with SignalFlow AI." />
            <meta name="keywords" content="forex trading bot, telegram signals, metatrader automation, ai trading, groq trading, forex automation" />
            <meta property="og:title" content="SignalFlow AI - Telegram to MetaTrader Automation" />
            <meta property="og:description" content="The fastest way to turn Telegram signals into MetaTrader trades." />
            <meta property="og:type" content="website" />
          </Helmet>
          <Toaster />
          <Router />
          <LogsFAB logs={logs} />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
