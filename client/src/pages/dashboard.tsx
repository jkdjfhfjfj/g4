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
import { Activity, MessageSquare, BarChart3, TrendingUp, History, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    selectChannel,
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-2 px-3 py-2 md:px-4 md:py-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
            <h1 className="text-sm md:text-lg font-semibold truncate">Trading Bot</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBar
              wsStatus={connectionStatus}
              telegramStatus={telegramStatus}
              metaapiStatus={metaapiStatus}
            />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-0 flex-1 overflow-hidden">
        <aside className="w-full md:w-72 lg:w-80 md:border-r border-b md:border-b-0 border-border p-3 md:p-4 space-y-3 md:space-y-4 md:overflow-y-auto md:max-h-[calc(100vh-56px)]">
          <AccountInfo account={account} />
          <ChannelList
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={selectChannel}
            telegramStatus={telegramStatus}
          />
        </aside>

        <main className="flex-1 p-3 md:p-4 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-3 md:mb-4" data-testid="tabs-navigation">
              <TabsTrigger value="signals" className="text-xs md:text-sm gap-1" data-testid="tab-signals">
                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Signals</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="text-xs md:text-sm gap-1" data-testid="tab-messages">
                <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Messages</span>
              </TabsTrigger>
              <TabsTrigger value="positions" className="text-xs md:text-sm gap-1" data-testid="tab-positions">
                <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Positions</span>
              </TabsTrigger>
              <TabsTrigger value="markets" className="text-xs md:text-sm gap-1" data-testid="tab-markets">
                <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Markets</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs md:text-sm gap-1" data-testid="tab-history">
                <History className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="signals" className="mt-0 h-full">
                <SignalCards
                  signals={signals}
                  onExecute={executeTrade}
                  onDismiss={dismissSignal}
                />
              </TabsContent>

              <TabsContent value="messages" className="mt-0 h-full">
                <MessageFeed
                  messages={messages}
                  selectedChannelId={selectedChannelId}
                />
              </TabsContent>

              <TabsContent value="positions" className="mt-0 h-full">
                <PositionsPanel
                  positions={positions}
                  onClosePosition={closePosition}
                />
              </TabsContent>

              <TabsContent value="markets" className="mt-0 h-full">
                <MarketsPanel markets={markets} onTrade={manualTrade} />
              </TabsContent>

              <TabsContent value="history" className="mt-0 h-full">
                <HistoryPanel trades={history} />
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>

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
