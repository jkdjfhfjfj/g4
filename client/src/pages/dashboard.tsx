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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Trading Bot</h1>
          </div>
          <StatusBar
            wsStatus={connectionStatus}
            telegramStatus={telegramStatus}
            metaapiStatus={metaapiStatus}
          />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside className="w-full lg:w-80 border-r border-border p-4 space-y-4">
          <AccountInfo account={account} />
          <ChannelList
            channels={channels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={selectChannel}
            telegramStatus={telegramStatus}
          />
        </aside>

        <main className="flex-1 p-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-4">
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

            <div className="space-y-4">
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
