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
import { Separator } from "@/components/ui/separator";

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
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-3 py-3 md:px-4 md:py-4 space-y-3">
          {/* Top row: Logo + Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
              <h1 className="text-sm md:text-lg font-semibold truncate">Trading Bot</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-xs hidden sm:flex">
                <Bot className="h-3.5 w-3.5" />
                <span>Auto</span>
                <Switch
                  checked={autoTradeEnabled}
                  onCheckedChange={toggleAutoTrade}
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

      {/* Main content - Sidebar + Content */}
      <div className="flex flex-col md:flex-row gap-0 flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Account Info (hidden on mobile) */}
        <aside className="hidden md:flex md:flex-col w-full md:w-72 lg:w-80 md:border-r border-border p-4 space-y-4 overflow-y-auto">
          <AccountInfo account={account} />
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden md:p-4">
          {/* Desktop: Top section (Account info on desktop) */}
          <div className="hidden md:block mb-4">
            {/* Account info already in sidebar */}
          </div>

          {/* Content tabs */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tab content area */}
            <div className="flex-1 overflow-y-auto px-3 md:px-0 pb-20 md:pb-0">
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
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-around gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-primary border-t-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-mobile-${tab.id}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop: Account info sidebar toggle for mobile (in header) */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-30 bg-background/95 border-b border-border p-3 max-h-32 overflow-y-auto hidden" id="mobile-account-panel">
        <AccountInfo account={account} />
      </div>

      {/* Mobile: Auto-trade toggle in bottom area */}
      <div className="md:hidden fixed bottom-20 left-3 right-3 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleAutoTrade(!autoTradeEnabled)}
          className="w-full justify-start gap-2"
          data-testid="mobile-toggle-auto-trade"
        >
          <Bot className="h-4 w-4" />
          Auto-Trade: {autoTradeEnabled ? "ON" : "OFF"}
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
