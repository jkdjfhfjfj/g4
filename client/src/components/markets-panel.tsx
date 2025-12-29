import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, TrendingUp, TrendingDown, Search } from "lucide-react";
import type { MarketSymbol } from "@shared/schema";

interface MarketsPanelProps {
  markets: MarketSymbol[];
  onTrade: (
    symbol: string,
    direction: "BUY" | "SELL",
    volume: number,
    stopLoss?: number,
    takeProfit?: number
  ) => void;
}

interface TradeDialogProps {
  symbol: MarketSymbol | null;
  direction: "BUY" | "SELL";
  open: boolean;
  onClose: () => void;
  onTrade: (volume: number, stopLoss?: number, takeProfit?: number) => void;
}

function TradeDialog({ symbol, direction, open, onClose, onTrade }: TradeDialogProps) {
  const [volume, setVolume] = useState("0.01");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const handleTrade = () => {
    onTrade(
      parseFloat(volume),
      stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit ? parseFloat(takeProfit) : undefined
    );
    onClose();
  };

  if (!symbol) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {direction === "BUY" ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            {direction} {symbol.symbol}
          </DialogTitle>
          <DialogDescription>
            {direction === "BUY" ? `Ask: ${symbol.ask}` : `Bid: ${symbol.bid}`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="volume" className="text-right">
              Volume
            </Label>
            <Input
              id="volume"
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="col-span-3 font-mono"
              data-testid="input-market-trade-volume"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stopLoss" className="text-right">
              Stop Loss
            </Label>
            <Input
              id="stopLoss"
              type="number"
              step="0.00001"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Optional"
              className="col-span-3 font-mono"
              data-testid="input-market-trade-stoploss"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="takeProfit" className="text-right">
              Take Profit
            </Label>
            <Input
              id="takeProfit"
              type="number"
              step="0.00001"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Optional"
              className="col-span-3 font-mono"
              data-testid="input-market-trade-takeprofit"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleTrade}
            className={
              direction === "BUY"
                ? "bg-success text-success-foreground"
                : "bg-destructive text-destructive-foreground"
            }
            data-testid="button-confirm-market-trade"
          >
            {direction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MarketsPanel({ markets, onTrade }: MarketsPanelProps) {
  const [search, setSearch] = useState("");
  const [tradeSymbol, setTradeSymbol] = useState<MarketSymbol | null>(null);
  const [tradeDirection, setTradeDirection] = useState<"BUY" | "SELL">("BUY");

  const filteredMarkets = markets.filter((m) =>
    m.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenTrade = (symbol: MarketSymbol, direction: "BUY" | "SELL") => {
    setTradeSymbol(symbol);
    setTradeDirection(direction);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Markets
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              data-testid="input-market-search"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {markets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading markets...</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Symbol</TableHead>
                    <TableHead className="text-xs text-right">Bid</TableHead>
                    <TableHead className="text-xs text-right">Ask</TableHead>
                    <TableHead className="text-xs text-right">Spread</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMarkets.map((market) => (
                    <TableRow key={market.symbol} data-testid={`market-row-${market.symbol}`}>
                      <TableCell className="font-medium text-sm">
                        {market.symbol}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive">
                        {market.bid.toFixed(market.digits)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-success">
                        {market.ask.toFixed(market.digits)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {(market.spread * Math.pow(10, market.digits - 1)).toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-success"
                            onClick={() => handleOpenTrade(market, "BUY")}
                            data-testid={`button-buy-${market.symbol}`}
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Buy
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive"
                            onClick={() => handleOpenTrade(market, "SELL")}
                            data-testid={`button-sell-${market.symbol}`}
                          >
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Sell
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <TradeDialog
        symbol={tradeSymbol}
        direction={tradeDirection}
        open={!!tradeSymbol}
        onClose={() => setTradeSymbol(null)}
        onTrade={(volume, stopLoss, takeProfit) =>
          tradeSymbol && onTrade(tradeSymbol.symbol, tradeDirection, volume, stopLoss, takeProfit)
        }
      />
    </>
  );
}
