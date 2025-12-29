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
import { useEffect } from "react";
import { Activity } from "lucide-react";

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

      <div className="flex flex-col md:flex-row gap-4 md:gap-0 flex-1 overflow-hidden">
        <aside className="w-full md:w-80 md:border-r border-b md:border-b-0 border-border p-3 md:p-4 space-y-3 md:space-y-4 md:overflow-y-auto">
          <AccountInfo account={account} />
          <ChannelList
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={selectChannel}
            telegramStatus={telegramStatus}
          />
        </aside>

        <main className="flex-1 p-3 md:p-4 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 auto-rows-max md:auto-rows-auto">
            <div className="space-y-3 md:space-y-4">
              <SignalCards
                signals={signals}
                onExecute={executeTrade}
                onDismiss={dismissSignal}
              />
              <MessageFeed
                messages={messages}
                selectedChannelId={selectedChannelId}
              />
            </div>

            <div className="space-y-3 md:space-y-4">
              <PositionsPanel
                positions={positions}
                onClosePosition={closePosition}
              />
              <MarketsPanel markets={markets} onTrade={manualTrade} />
              <HistoryPanel trades={history} />
            </div>
          </div>
        </main>
      </div>

      <AuthDialog
        open={authRequired}
        onSubmitPhone={submitPhoneNumber}
        onSubmitCode={submitAuthCode}
        onSubmitPassword={submitPassword}
      />
    </div>
  );
}
