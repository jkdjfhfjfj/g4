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
import { TrendingUp, MessageSquare, Wallet, BarChart3, History, Bot } from "lucide-react";
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
        <div className="px-4 py-3 space-y-3">
          {/* Top controls row */}
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold">Trading Bot</h1>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-white/15 rounded-full text-xs font-medium">
                <Bot className="h-3.5 w-3.5" />
                <Switch
                  checked={autoTradeEnabled}
                  onCheckedChange={() => toggleAutoTrade(!autoTradeEnabled)}
                  data-testid="toggle-auto-trade"
                  className="scale-75"
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

      {/* Main content - properly sized to avoid overlap */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Account info bar - compact */}
        {account && (
          <div className="bg-card border-b border-border px-4 py-2 text-xs">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground">Balance: </span>
                  <span className="font-mono font-semibold">{account.currency} {account.balance.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Equity: </span>
                  <span className="font-mono font-semibold">{account.currency} {account.equity.toFixed(2)}</span>
                </div>
              </div>
              <div className={`font-mono font-semibold ${account.equity - account.balance >= 0 ? "text-success" : "text-destructive"}`}>
                P/L: {account.equity - account.balance >= 0 ? "+" : ""}{(account.equity - account.balance).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Tab content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-4 pb-28 md:pb-4">
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

      {/* Mobile: Auto-trade toggle - above bottom nav */}
      <div className="md:hidden fixed bottom-20 left-3 right-3 z-30">
        <Button
          onClick={() => toggleAutoTrade(!autoTradeEnabled)}
          className={`w-full font-semibold shadow-lg text-sm ${
            autoTradeEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground border border-border"
          }`}
          data-testid="mobile-toggle-auto-trade"
        >
          <Bot className="h-4 w-4 mr-2" />
          {autoTradeEnabled ? "Auto-Trade ON" : "Auto-Trade OFF"}
        </Button>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-2xl">
        <div className="flex items-center justify-around gap-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-2 text-xs font-medium transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                data-testid={`tab-mobile-${tab.id}`}
              >
                <div className={`p-2 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary/15"
                    : "bg-transparent"
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

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
