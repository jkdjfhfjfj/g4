import { useWebSocket } from "@/hooks/use-websocket";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBar } from "@/components/connection-status";
import { SignalCards } from "@/components/signal-cards";
import { PositionsPanel } from "@/components/positions-panel";
import { MarketsPanel } from "@/components/markets-panel";
import { HistoryPanel } from "@/components/history-panel";
import { AuthDialog } from "@/components/auth-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { TrendingUp, MessageSquare, Wallet, BarChart3, History, Bot, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    { id: "signals", label: "Signals", icon: TrendingUp, count: signals.filter(s => s.status === 'pending').length },
    { id: "markets", label: "Markets", icon: BarChart3, count: markets.length },
    { id: "positions", label: "Positions", icon: Wallet, count: positions.length },
    { id: "history", label: "History", icon: History, count: history.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/15 rounded-lg">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Trading Bot</h1>
              <p className="text-xs text-muted-foreground">Real-time signal executor</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <StatusBar
              wsStatus={connectionStatus}
              telegramStatus={telegramStatus}
              metaapiStatus={metaapiStatus}
            />
            <ThemeToggle />
          </div>
        </div>

        {/* Channel Selector & Auto-Trade */}
        <div className="px-4 py-3 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <select
                value={selectedChannelId || ""}
                onChange={(e) => selectChannel(e.target.value)}
                disabled={telegramStatus !== "connected"}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
                data-testid="select-channel"
              >
                <option value="">Select a channel...</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.isPrivate ? "🔒" : "📢"} {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Auto-Trade</span>
              <Switch
                checked={autoTradeEnabled}
                onCheckedChange={() => toggleAutoTrade(!autoTradeEnabled)}
                data-testid="toggle-auto-trade"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Account Info Card */}
          {account && (
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Account Status</CardTitle>
                  <Badge variant={account.connected ? "default" : "secondary"}>
                    {account.connected ? "Live" : "Offline"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-lg font-bold font-mono">{account.currency} {account.balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Equity</p>
                    <p className="text-lg font-bold font-mono">{account.currency} {account.equity.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">P/L</p>
                    <p className={`text-lg font-bold font-mono ${account.equity - account.balance >= 0 ? "text-success" : "text-destructive"}`}>
                      {account.equity - account.balance >= 0 ? "+" : ""}{(account.equity - account.balance).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Free Margin</p>
                    <p className="text-lg font-bold font-mono">{account.freeMargin.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rate Limit Warning */}
          {metaapiStatus !== "connected" && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="pt-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">MetaAPI Rate Limited</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Data will update every 60 seconds. Market data is being throttled to respect API limits.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === "signals" && (
              <SignalCards
                signals={signals}
                onExecute={executeTrade}
                onDismiss={dismissSignal}
                autoTradeEnabled={autoTradeEnabled}
              />
            )}
            {activeTab === "markets" && (
              <MarketsPanel markets={markets} onTrade={manualTrade} />
            )}
            {activeTab === "positions" && (
              <PositionsPanel positions={positions} onClosePosition={closePosition} />
            )}
            {activeTab === "history" && (
              <HistoryPanel trades={history} />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-all relative ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-mobile-${tab.id}`}
              >
                <div className={`p-2 rounded-lg transition-all ${isActive ? "bg-primary/15" : ""}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0">
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Navigation - Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-screen w-20 bg-card border-r border-border flex-col items-center justify-start pt-6 gap-4 z-30">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-lg transition-all relative ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              title={tab.label}
              data-testid={`tab-desktop-${tab.id}`}
            >
              <Icon className="h-5 w-5" />
              {tab.count > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
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
