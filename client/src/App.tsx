import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LandingPage from "@/pages/LandingPage";
import FeaturesPage from "@/pages/seo/Features";
import HowItWorksPage from "@/pages/seo/HowItWorks";
import PricingPage from "@/pages/seo/Pricing";
import { useEffect } from "react";
import { LogsFAB } from "@/components/logs-fab";
import { useWebSocket } from "@/hooks/use-websocket";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/features" component={FeaturesPage} />
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { logs } = useWebSocket();
  const [location] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const isLandingPage = location === "/";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="relative min-h-screen w-full overflow-x-hidden">
          <Helmet>
            <title>TGTOMT - Telegram to MetaTrader Trading Bot</title>
            <meta name="description" content="TGTOMT: The ultimate Telegram to MetaTrader automation tool. Automatically detect forex signals and execute trades on MT4/MT5 with AI-powered analysis." />
            <meta name="keywords" content="TGTOMT, telegram to metatrader, forex signals, mt4 automation, mt5 automation, ai trading bot, telegram trading bot" />
            <meta name="google-site-verification" content="-8_Efzyo-l_E5IQM1ZOfg710Ss6EjINV-drRzFuEIVg" />
            <meta property="og:title" content="TGTOMT - Telegram to MetaTrader Automation" />
            <meta property="og:description" content="Automate your forex signals from Telegram to MT4/MT5 instantly." />
            <meta property="og:type" content="website" />
          </Helmet>
          <Toaster />
          <Router />
          {!isLandingPage && <LogsFAB logs={logs} />}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
