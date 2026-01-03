import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, BarChart3, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TradeHistory } from "@shared/schema";

interface TradeHistoryExtended extends TradeHistory {
  comment?: string;
}

interface HistoryPanelProps {
  trades: TradeHistoryExtended[];
}

export function HistoryPanel({ trades }: HistoryPanelProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-col">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" />
              Trade History
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <div className="max-w-md space-y-4">
          <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto">
            <BarChart3 className="h-12 w-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">History Sync Disabled</h3>
            <p className="text-sm text-muted-foreground">
              Direct history sync has been disabled to prevent MetaAPI rate limits from interfering with your trade execution speed. 
              This ensures your orders are processed instantly.
            </p>
          </div>
          <div className="pt-4">
            <p className="text-xs text-muted-foreground mb-4">
              Need to see your detailed performance report or have questions?
            </p>
            <Button asChild className="gap-2">
              <a href="https://t.me/your_telegram_handle" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Contact Us on Telegram
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
