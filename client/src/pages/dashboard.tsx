import { ChannelList } from "@/components/channel-list";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
    selectedChannelIds,
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
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (authRequired) {
      setAuthModalOpen(true);
    }
  }, [authRequired]);

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
    <div className="flex h-screen w-full bg-gradient-to-b from-background to-background/50">
      {/* Sidebar for Desktop */}
      <nav className="hidden md:flex h-screen w-20 bg-card border-r border-border flex-col items-center justify-start pt-6 gap-4 z-50 flex-shrink-0">
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

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Header */}
        <header className="flex-shrink-0 z-40 bg-card border-b border-border w-full">
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
              <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-background rounded-lg border border-border h-9 md:h-10">
                <Label htmlFor="quick-lot" className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Lot</Label>
                <Input
                  id="quick-lot"
                  type="text"
                  inputMode="decimal"
                  value={lotSize === 0 ? "" : lotSize}
                  onChange={(e) => updateLotSize(e.target.value as any)}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) updateLotSize(val);
                  }}
                  className="w-16 h-7 text-xs font-mono border-none focus-visible:ring-0 p-1"
                />
              </div>

              <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 md:px-3 md:py-2 bg-background rounded-lg border border-border flex-shrink-0 h-9 md:h-10">
                <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs md:text-sm font-medium whitespace-nowrap">Auto</span>
                <Switch
                  checked={autoTradeEnabled}
                  onCheckedChange={() => toggleAutoTrade(!autoTradeEnabled)}
                  data-testid="toggle-auto-trade"
                  className="scale-75 origin-right md:scale-100"
                />
              </div>

              {telegramStatus === "connected" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={disconnectTelegram}
                  className="h-9 w-9 md:h-10 md:w-10 text-destructive hover:bg-destructive/10"
                  title="Disconnect Telegram"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}

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

          {/* Channel Selector Row */}
          <div className="px-3 md:px-4 py-2 md:py-3 border-t border-border/50 bg-muted/30">
            <ChannelList
              channels={channels}
              selectedChannelIds={selectedChannelIds}
              onSelectChannel={selectChannel}
              telegramStatus={telegramStatus}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full">
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
                <MessageFeed messages={messages} selectedChannelId={selectedChannelIds.length > 0 ? selectedChannelIds[0] : null} />
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
      </div>

      {/* Auth Dialog */}
      <AuthDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        step={authStep}
        error={authError}
        onSubmitPhone={submitPhoneNumber}
        onSubmitCode={submitAuthCode}
        onSubmitPassword={submitPassword}
      />
    </div>
  );
}
