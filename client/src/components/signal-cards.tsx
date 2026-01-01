import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  X,
  Check,
  Target,
  StopCircle,
} from "lucide-react";
import type { ParsedSignal } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface SignalCardsProps {
  signals: ParsedSignal[];
  onExecute: (signalId: string, volume: number, stopLoss?: number, takeProfit?: number) => void;
  onDismiss: (signalId: string) => void;
  autoTradeEnabled?: boolean;
}

interface ExecuteDialogProps {
  signal: ParsedSignal;
  open: boolean;
  onClose: () => void;
  onExecute: (volume: number, stopLoss?: number, takeProfit?: number) => void;
}

function ExecuteDialog({ signal, open, onClose, onExecute }: ExecuteDialogProps) {
  const [volume, setVolume] = useState("0.01");
  const [stopLoss, setStopLoss] = useState(signal.stopLoss?.toString() || "");
  const [takeProfit, setTakeProfit] = useState(
    signal.takeProfit?.[0]?.toString() || ""
  );

  const handleExecute = () => {
    const vol = parseFloat(volume);
    if (isNaN(vol) || vol <= 0) return;
    onExecute(
      vol,
      stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit ? parseFloat(takeProfit) : undefined
    );
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {signal.direction === "BUY" ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            Execute {signal.direction} {signal.symbol}
          </DialogTitle>
          <DialogDescription>
            Confirm trade parameters before execution
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="volume" className="text-right">
              Volume
            </Label>
            <Input
              id="volume"
              type="text"
              inputMode="decimal"
              value={volume}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                  setVolume(val);
                }
              }}
              className="col-span-3 font-mono"
              data-testid="input-trade-volume"
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
              data-testid="input-trade-stoploss"
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
              data-testid="input-trade-takeprofit"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-trade">
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            className={
              signal.direction === "BUY"
                ? "bg-success text-success-foreground"
                : "bg-destructive text-destructive-foreground"
            }
            data-testid="button-confirm-trade"
          >
            <Check className="h-4 w-4 mr-2" />
            Execute Trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SignalCard({
  signal,
  onExecute,
  onDismiss,
}: {
  signal: ParsedSignal;
  onExecute: (volume: number, stopLoss?: number, takeProfit?: number) => void;
  onDismiss: () => void;
}) {
  const isBuy = signal.direction === "BUY";
  const isPending = signal.status === "pending";

  return (
    <Card
      className={`border-l-4 ${
        isBuy ? "border-l-success" : "border-l-destructive"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {isBuy ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            <span className="font-semibold text-lg">{signal.symbol}</span>
            <Badge
              variant={isBuy ? "default" : "destructive"}
              className={isBuy ? "bg-success text-success-foreground" : ""}
            >
              {signal.direction}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {signal.modelUsed && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground border-muted-foreground/20 font-mono mr-1">
                {signal.modelUsed}
              </Badge>
            )}
            <Zap className="h-3.5 w-3.5 text-warning" />
            <span className="text-sm font-medium">{Math.round(signal.confidence * 100)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          {signal.entryPrice && (
            <div>
              <p className="text-xs text-muted-foreground">Entry</p>
              <p className="font-mono font-medium">{signal.entryPrice}</p>
            </div>
          )}
          {signal.stopLoss && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <StopCircle className="h-3 w-3 text-destructive" /> SL
              </p>
              <p className="font-mono font-medium">{signal.stopLoss}</p>
            </div>
          )}
          {signal.takeProfit && signal.takeProfit.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3 text-success" /> TP
              </p>
              <p className="font-mono font-medium">{signal.takeProfit[0]}</p>
            </div>
          )}
        </div>

        {signal.verdictDescription && (
          <div className="mt-1 p-2 rounded bg-muted/30 border border-border/50">
            <p className="text-[11px] text-muted-foreground leading-snug italic">
              {signal.verdictDescription}
            </p>
          </div>
        )}

        {signal.status === "failed" && signal.failureReason && (
          <div className="mt-1 p-2 rounded bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 text-destructive mt-0.5" />
            <p className="text-[11px] text-destructive leading-snug">
              Failed: {signal.failureReason}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(signal.timestamp), { addSuffix: true })}
          </span>
          {isPending && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                data-testid={`button-dismiss-signal-${signal.id}`}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => onExecute(Number(signal.id), 0.01)}
                className={
                  isBuy
                    ? "bg-success text-success-foreground"
                    : "bg-destructive text-destructive-foreground"
                }
                data-testid={`button-execute-signal-${signal.id}`}
              >
                Execute
              </Button>
            </div>
          )}
          {signal.status === "executed" && (
            <Badge variant="outline" className="text-xs">
              Executed
            </Badge>
          )}
          {signal.status === "dismissed" && (
            <Badge variant="secondary" className="text-xs">
              Dismissed
            </Badge>
          )}
          {signal.status === "failed" && (
            <Badge variant="destructive" className="text-xs">
              Failed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SignalCards({ signals, onExecute, onDismiss }: SignalCardsProps) {
  const [executeSignal, setExecuteSignal] = useState<ParsedSignal | null>(null);

  const pendingSignals = signals.filter((s) => s.status === "pending");

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Detected Signals
            </CardTitle>
            {pendingSignals.length > 0 && (
              <Badge variant="default" className="text-xs">
                {pendingSignals.length} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No signals detected yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Signals will appear when valid trading opportunities are found
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="px-4 py-2 space-y-3">
                {signals.map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onExecute={(volume, stopLoss, takeProfit) => 
                  onExecute(signal.id, volume, stopLoss, takeProfit)
                }
                    onDismiss={() => onDismiss(signal.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {executeSignal && (
        <ExecuteDialog
          signal={executeSignal}
          open={!!executeSignal}
          onClose={() => setExecuteSignal(null)}
          onExecute={(volume, stopLoss, takeProfit) =>
            onExecute(executeSignal.id, volume, stopLoss, takeProfit)
          }
        />
      )}
    </>
  );
}
