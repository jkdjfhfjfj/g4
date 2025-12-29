import { useWebSocket } from "@/hooks/use-websocket";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBar } from "@/components/connection-status";
import { AccountInfo } from "@/components/account-info";
import { ChannelList } from "@/components/channel-list";
import { MessageFeed } from "@/components/message-feed";
import { SignalCards } from "@/components/signal-cards";
import { PositionsPanel } from "@/components/positions-panel";
import { MarketsPanel } from "@/components/markets-panel";
import { HistoryPanel } from "@/components/history-panel";
import { AuthDialog } from "@/components/auth-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Activity, MessageSquare, BarChart3, TrendingUp, History, Wallet, Bot } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const {
    connectionStatus,
    telegramStatus,
    metaapiStatus,
    channels,
    selectedChannelId,
    messages,
    signals,
    account,
    positions,
    markets,
    history,
    error,
    authRequired,
    authStep,
    authError,
    autoTradeEnabled,
    selectChannel,
    toggleAutoTrade,
    executeTrade,
    dismissSignal,
    closePosition,
    submitAuthCode,
    submitPhoneNumber,
    submitPassword,
    manualTrade,
  } = useWebSocket();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("signals");

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    }
  }, [error, toast]);

  const tabs = [
    { id: "signals", label: "Signals", icon: TrendingUp },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "positions", label: "Positions", icon: Wallet },
    { id: "markets", label: "Markets", icon: BarChart3 },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Material Design Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg">
        <div className="px-4 py-4 space-y-4">
          {/* Top row: Logo + Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Activity className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">Trading Bot</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/10 rounded-full text-sm">
                <Bot className="h-4 w-4" />
                <Switch
                  checked={autoTradeEnabled}
                  onCheckedChange={() => toggleAutoTrade(!autoTradeEnabled)}
                  data-testid="toggle-auto-trade"
                />
              </div>
              <StatusBar
                wsStatus={connectionStatus}
                telegramStatus={telegramStatus}
                metaapiStatus={metaapiStatus}
              />
              <ThemeToggle />
            </div>
          </div>

          {/* Channel selector */}
          <ChannelList
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={selectChannel}
            telegramStatus={telegramStatus}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-col md:flex-row gap-0 flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Account Info (hidden on mobile) */}
        <aside className="hidden md:flex md:flex-col w-full md:w-72 lg:w-80 md:border-r border-border p-4 space-y-4 overflow-y-auto">
          <AccountInfo account={account} />
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden md:p-4 p-3">
          {/* Content tabs */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tab content area with Material Design card */}
            <div className="flex-1 overflow-y-auto pb-24 md:pb-0">
              <div className="space-y-4">
                {activeTab === "signals" && (
                  <SignalCards
                    signals={signals}
                    onExecute={executeTrade}
                    onDismiss={dismissSignal}
                    autoTradeEnabled={autoTradeEnabled}
                  />
                )}
                {activeTab === "messages" && (
                  <MessageFeed
                    messages={messages}
                    selectedChannelId={selectedChannelId}
                  />
                )}
                {activeTab === "positions" && (
                  <PositionsPanel
                    positions={positions}
                    onClosePosition={closePosition}
                  />
                )}
                {activeTab === "markets" && (
                  <MarketsPanel markets={markets} onTrade={manualTrade} />
                )}
                {activeTab === "history" && (
                  <HistoryPanel trades={history} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Material Design */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card shadow-2xl">
        <div className="flex items-center justify-around gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-2 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-mobile-${tab.id}`}
              >
                <div
                  className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile: Auto-trade toggle */}
      <div className="md:hidden fixed bottom-24 left-3 right-3 z-30">
        <Button
          onClick={() => toggleAutoTrade(!autoTradeEnabled)}
          className={`w-full justify-center gap-2 font-semibold shadow-lg ${
            autoTradeEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground border border-border"
          }`}
          data-testid="mobile-toggle-auto-trade"
        >
          <Bot className="h-5 w-5" />
          {autoTradeEnabled ? "Auto-Trade ON" : "Auto-Trade OFF"}
        </Button>
      </div>

      {/* Auth Dialog */}
      <AuthDialog
        open={authRequired}
        step={authStep}
        error={authError}
        onSubmitPhone={submitPhoneNumber}
        onSubmitCode={submitAuthCode}
        onSubmitPassword={submitPassword}
      />
    </div>
  );
}
