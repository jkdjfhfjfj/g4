import { useWebSocket } from "@/hooks/use-websocket";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBar, MobileStatusBar } from "@/components/connection-status";
import { SignalCards } from "@/components/signal-cards";
import { MessageFeed } from "@/components/message-feed";
import { PositionsPanel } from "@/components/positions-panel";
import { MarketsPanel } from "@/components/markets-panel";
import { HistoryPanel } from "@/components/history-panel";
import { AuthDialog } from "@/components/auth-dialog";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { TrendingUp, MessageSquare, Wallet, BarChart3, History, Bot, AlertCircle, LogOut, Settings, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    modifyPosition,
    tradeResult,
    lotSize,
    updateLotSize,
    disconnectTelegram,
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

  useEffect(() => {
    if (tradeResult) {
      toast({
        variant: tradeResult.success ? "default" : "destructive",
        title: tradeResult.success ? "Success" : "Failed",
        description: tradeResult.message,
      });
    }
  }, [tradeResult, toast]);

  const tabs = [
    { id: "signals", label: "Signals", icon: TrendingUp, count: signals.filter(s => s.status === 'pending').length },
    { id: "messages", label: "Messages", icon: MessageSquare, count: messages.length },
    { id: "markets", label: "Markets", icon: BarChart3, count: markets.length },
    { id: "positions", label: "Positions", icon: Wallet, count: positions.length },
    { id: "history", label: "History", icon: History, count: history.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 flex flex-col">
      {/* Fixed Header - Not Scrollable */}
      <header className="fixed top-0 left-0 md:left-20 right-0 z-40 bg-card border-b border-border">
        {/* Main Header Row */}
        <div className="px-3 md:px-4 py-2 md:py-3 flex items-center justify-between gap-2">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 md:p-2 bg-primary/15 rounded-lg flex-shrink-0">
              <Bot className="h-4 md:h-5 w-4 md:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-lg font-bold truncate">Trading Bot</h1>
              <p className="text-xs text-muted-foreground hidden md:block">Real-time signal executor</p>
            </div>
          </div>

          {/* Status & Theme Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBar
              wsStatus={connectionStatus}
              telegramStatus={telegramStatus}
              metaapiStatus={metaapiStatus}
            />
            <MobileStatusBar
              wsStatus={connectionStatus}
              telegramStatus={telegramStatus}
              metaapiStatus={metaapiStatus}
            />
            <ThemeToggle />
          </div>
        </div>

        {/* Channel Selector & Auto-Trade Row */}
        <div className="px-3 md:px-4 py-2 md:py-3 border-t border-border/50 bg-muted/30 flex flex-col md:flex-row gap-2 md:gap-3">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search channels..."
                className="pl-9 h-9 md:h-10 text-xs md:text-sm"
                onChange={(e) => {
                  const query = e.target.value.toLowerCase();
                  const options = document.querySelectorAll('#channel-select option');
                  options.forEach(opt => {
                    const text = (opt as HTMLOptionElement).text.toLowerCase();
                    (opt as HTMLOptionElement).style.display = text.includes(query) || (opt as HTMLOptionElement).value === "" ? "block" : "none";
                  });
                }}
              />
            </div>
            <select
              id="channel-select"
              value={selectedChannelId || ""}
              onChange={(e) => selectChannel(e.target.value)}
              disabled={telegramStatus !== "connected"}
              className="flex-1 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border border-border bg-background text-xs md:text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="select-channel"
            >
              <option value="">Select channel...</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.isPrivate ? "🔒" : "📢"} {ch.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 bg-background rounded-lg border border-border flex-shrink-0 h-9 md:h-10">
            <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs md:text-sm font-medium whitespace-nowrap">Auto</span>
            <Switch
              checked={autoTradeEnabled}
              onCheckedChange={() => toggleAutoTrade(!autoTradeEnabled)}
              data-testid="toggle-auto-trade"
              className="scale-75 origin-right md:scale-100"
            />
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 bg-background rounded-lg border border-border flex-shrink-0 h-9 md:h-10">
            <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs md:text-sm font-medium whitespace-nowrap">Lot:</span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={lotSize}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || !isNaN(parseFloat(val))) {
                  updateLotSize(val as any);
                }
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (isNaN(val) || val < 0.01) {
                  updateLotSize(0.01);
                }
              }}
              className="w-16 h-7 text-xs font-mono px-2"
              data-testid="input-lot-size"
            />
          </div>

          {telegramStatus === "connected" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectTelegram}
              className="flex items-center gap-1 text-xs text-destructive h-9 md:h-10"
              data-testid="button-disconnect-telegram"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Disconnect</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content - Account for fixed header */}
      <main className="flex-1 overflow-auto pt-[160px] md:pt-[180px] md:pl-20">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-28 md:pb-6">
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
                    Data updates every 60 seconds to respect API limits.
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
            {activeTab === "messages" && (
              <MessageFeed messages={messages} selectedChannelId={selectedChannelId} />
            )}
            {activeTab === "markets" && (
              <MarketsPanel markets={markets} onTrade={manualTrade} />
            )}
            {activeTab === "positions" && (
              <PositionsPanel 
                positions={positions} 
                onClosePosition={closePosition}
                onModifyPosition={modifyPosition}
              />
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
