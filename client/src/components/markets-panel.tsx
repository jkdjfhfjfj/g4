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
import { BarChart3, TrendingUp, TrendingDown, Search, RefreshCw } from "lucide-react";
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

  const midPrice = (symbol.bid + symbol.ask) / 2;

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
            Mid: {midPrice.toFixed(symbol.digits)}, Spread: {symbol.spread.toFixed(symbol.digits + 1)}
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
              step={`0.${'0'.repeat(symbol.digits - 1)}1`}
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
              step={`0.${'0'.repeat(symbol.digits - 1)}1`}
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
            data-testid="button-market-trade-execute"
          >
            {direction}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MarketsPanel({ markets, onTrade }: MarketsPanelProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol | null>(null);
  const [tradeDirection, setTradeDirection] = useState<"BUY" | "SELL">("BUY");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredMarkets = markets.filter((m) =>
    m.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTrade = (symbol: MarketSymbol, direction: "BUY" | "SELL") => {
    setSelectedSymbol(symbol);
    setTradeDirection(direction);
    setDialogOpen(true);
  };

  const handleExecuteTrade = (volume: number, stopLoss?: number, takeProfit?: number) => {
    if (selectedSymbol) {
      onTrade(selectedSymbol.symbol, tradeDirection, volume, stopLoss, takeProfit);
      setDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Market Symbols ({markets.length})
            </CardTitle>
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  data-testid="input-market-search"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {markets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading market data...</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)] min-h-[200px] max-h-[400px] w-full border-t border-border">
              <div className="min-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs px-4">Symbol</TableHead>
                      <TableHead className="text-xs text-right px-4">Bid</TableHead>
                      <TableHead className="text-xs text-right px-4">Ask</TableHead>
                      <TableHead className="text-xs text-right px-4">Spread</TableHead>
                      <TableHead className="text-xs px-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMarkets.map((market) => (
                      <TableRow key={market.symbol} data-testid={`market-row-${market.symbol}`}>
                      <TableCell className="font-mono font-medium text-sm">
                        {market.symbol}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {market.bid.toFixed(market.digits)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {market.ask.toFixed(market.digits)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="text-warning font-medium">
                          {market.spread.toFixed(market.digits + 1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            className="h-7 px-2 bg-success text-success-foreground text-xs"
                            onClick={() => handleTrade(market, "BUY")}
                            data-testid={`button-buy-${market.symbol}`}
                          >
                            <TrendingUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleTrade(market, "SELL")}
                            data-testid={`button-sell-${market.symbol}`}
                          >
                            <TrendingDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <TradeDialog
        symbol={selectedSymbol}
        direction={tradeDirection}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onTrade={handleExecuteTrade}
      />
    </>
  );
}
