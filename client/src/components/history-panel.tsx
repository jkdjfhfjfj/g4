import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { TradeHistory } from "@shared/schema";
import { format } from "date-fns";

interface TradeHistoryExtended extends TradeHistory {
  comment?: string;
}

interface HistoryPanelProps {
  trades: TradeHistoryExtended[];
}

export function HistoryPanel({ trades }: HistoryPanelProps) {
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const winningTrades = trades.filter((t) => t.profit > 0).length;
  const losingTrades = trades.filter((t) => t.profit < 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
  const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);
  const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;
  const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Trade History ({trades.length})
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="font-mono">
              Wins: {winningTrades}/{trades.length}
            </Badge>
            <Badge
              variant={totalProfit >= 0 ? "default" : "destructive"}
              className="font-mono"
            >
              P/L: {totalProfit >= 0 ? "+" : ""}{totalProfit.toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {trades.length > 0 && (
        <div className="px-4 py-2 bg-card border-b border-border grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Win Rate</p>
            <p className="font-semibold text-foreground">{winRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Trade</p>
            <p className={`font-semibold ${avgProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {avgProfit >= 0 ? "+" : ""}{avgProfit.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Volume</p>
            <p className="font-semibold font-mono">{totalVolume.toFixed(2)}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-muted-foreground">Wins</p>
            <p className="font-semibold text-success">{winningTrades}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-muted-foreground">Losses</p>
            <p className="font-semibold text-destructive">{losingTrades}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-muted-foreground">Commission</p>
            <p className="font-mono font-semibold">{totalCommission.toFixed(2)}</p>
          </div>
        </div>
      )}

      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No trade history</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col w-full border-t border-border">
            <div className="overflow-x-auto overflow-y-auto w-full flex-1">
              <Table className="w-max min-w-full">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="text-xs px-3 py-2">Date</TableHead>
                    <TableHead className="text-xs px-3 py-2">Symbol</TableHead>
                    <TableHead className="text-xs px-3 py-2">Type</TableHead>
                    <TableHead className="text-xs text-right px-3 py-2">Volume</TableHead>
                    <TableHead className="text-xs text-right px-3 py-2">Entry</TableHead>
                    <TableHead className="text-xs text-right px-3 py-2">Exit</TableHead>
                    <TableHead className="text-xs text-right px-3 py-2">P/L</TableHead>
                    <TableHead className="text-xs px-3 py-2">Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id} data-testid={`history-row-${trade.id}`}>
                      <TableCell className="text-xs text-muted-foreground px-3 py-2">
                        {format(new Date(trade.closeTime), "MMM d HH:mm")}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-sm px-3 py-2">
                        {trade.symbol}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge
                          variant={trade.type === "buy" ? "default" : "destructive"}
                          className={`text-xs flex w-fit ${
                            trade.type === "buy"
                              ? "bg-success text-success-foreground"
                              : ""
                          }`}
                          data-testid={`badge-trade-type-${trade.id}`}
                        >
                          {trade.type === "buy" ? (
                            <TrendingUp className="h-2.5 w-2.5 mr-1" />
                          ) : (
                            <TrendingDown className="h-2.5 w-2.5 mr-1" />
                          )}
                          {trade.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs px-3 py-2">
                        {trade.volume.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs px-3 py-2">
                        {trade.openPrice.toFixed(5)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs px-3 py-2">
                        {trade.closePrice.toFixed(5)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs font-semibold px-3 py-2 ${
                          trade.profit >= 0 ? "text-success" : "text-destructive"
                        }`}
                        data-testid={`text-profit-${trade.id}`}
                      >
                        {trade.profit >= 0 ? "+" : ""}{trade.profit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[150px] truncate px-3 py-2">
                        {trade.comment || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
