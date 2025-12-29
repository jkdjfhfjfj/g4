import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, TrendingUp, TrendingDown } from "lucide-react";
import type { TradeHistory } from "@shared/schema";
import { format } from "date-fns";

interface HistoryPanelProps {
  trades: TradeHistory[];
}

export function HistoryPanel({ trades }: HistoryPanelProps) {
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const winningTrades = trades.filter((t) => t.profit > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Trade History
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              Win Rate: <span className="font-medium text-foreground">{winRate.toFixed(1)}%</span>
            </div>
            <span
              className={`text-sm font-medium font-mono ${
                totalProfit >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <History className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No trade history</p>
          </div>
        ) : (
          <ScrollArea className="h-[250px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Symbol</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Volume</TableHead>
                  <TableHead className="text-xs text-right">Entry</TableHead>
                  <TableHead className="text-xs text-right">Exit</TableHead>
                  <TableHead className="text-xs text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id} data-testid={`history-row-${trade.id}`}>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(trade.closeTime), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {trade.symbol}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={trade.type === "buy" ? "default" : "destructive"}
                        className={`text-xs ${
                          trade.type === "buy"
                            ? "bg-success text-success-foreground"
                            : ""
                        }`}
                      >
                        {trade.type === "buy" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {trade.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {trade.volume}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {trade.openPrice.toFixed(5)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {trade.closePrice.toFixed(5)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm font-medium ${
                        trade.profit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
