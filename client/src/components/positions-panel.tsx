import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Briefcase, TrendingUp, TrendingDown, X, Settings2 } from "lucide-react";
import type { Position } from "@shared/schema";

interface PositionsPanelProps {
  positions: Position[];
  onClosePosition: (positionId: string) => void;
  onModifyPosition?: (positionId: string, stopLoss?: number, takeProfit?: number) => void;
}

interface ModifyDialogProps {
  position: Position | null;
  open: boolean;
  onClose: () => void;
  onModify: (stopLoss?: number, takeProfit?: number) => void;
}

function ModifyDialog({ position, open, onClose, onModify }: ModifyDialogProps) {
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const handleModify = () => {
    const sl = stopLoss.trim() ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit.trim() ? parseFloat(takeProfit) : undefined;
    
    if ((stopLoss.trim() && isNaN(sl as number)) || (takeProfit.trim() && isNaN(tp as number))) {
      return;
    }
    
    onModify(sl, tp);
    onClose();
  };

  if (!position) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Modify {position.symbol}
          </DialogTitle>
          <DialogDescription>
            Update stop loss and take profit levels
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <Badge 
                variant={position.type === "buy" ? "default" : "destructive"}
                className={`ml-2 ${position.type === "buy" ? "bg-success text-success-foreground" : ""}`}
              >
                {position.type.toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Volume:</span>
              <span className="ml-2 font-mono">{position.volume}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Entry:</span>
              <span className="ml-2 font-mono">{position.openPrice.toFixed(5)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Current:</span>
              <span className="ml-2 font-mono">{position.currentPrice.toFixed(5)}</span>
            </div>
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
              placeholder={position.stopLoss?.toFixed(5) || "Not set"}
              className="col-span-3 font-mono"
              data-testid="input-modify-stoploss"
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
              placeholder={position.takeProfit?.toFixed(5) || "Not set"}
              className="col-span-3 font-mono"
              data-testid="input-modify-takeprofit"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleModify}
            data-testid="button-modify-confirm"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PositionsPanel({ positions, onClosePosition, onModifyPosition }: PositionsPanelProps) {
  const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);
  const [modifyPosition, setModifyPosition] = useState<Position | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleModify = (position: Position) => {
    setModifyPosition(position);
    setDialogOpen(true);
  };

  const handleModifyConfirm = (stopLoss?: number, takeProfit?: number) => {
    if (modifyPosition && onModifyPosition) {
      onModifyPosition(modifyPosition.id, stopLoss, takeProfit);
    }
    setDialogOpen(false);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Open Positions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {positions.length} open
              </Badge>
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
        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No open positions</p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col w-full border-t border-border">
              <div className="overflow-x-auto overflow-y-auto w-full flex-1">
                <Table className="w-max min-w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-xs px-3 py-2">Symbol</TableHead>
                      <TableHead className="text-xs px-3 py-2">Type</TableHead>
                      <TableHead className="text-xs text-right px-3 py-2">Volume</TableHead>
                      <TableHead className="text-xs text-right px-3 py-2">Entry</TableHead>
                      <TableHead className="text-xs text-right px-3 py-2">Current</TableHead>
                      <TableHead className="text-xs text-right px-3 py-2">SL/TP</TableHead>
                      <TableHead className="text-xs text-right px-3 py-2">P/L</TableHead>
                      <TableHead className="text-xs px-3 py-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id} data-testid={`position-row-${position.id}`}>
                        <TableCell className="font-medium text-sm px-3 py-2">
                          {position.symbol}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge
                            variant={position.type === "buy" ? "default" : "destructive"}
                            className={`text-xs ${
                              position.type === "buy"
                                ? "bg-success text-success-foreground"
                                : ""
                            }`}
                          >
                            {position.type === "buy" ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {position.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm px-3 py-2">
                          {position.volume}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm px-3 py-2">
                          {position.openPrice.toFixed(5)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm px-3 py-2">
                          {position.currentPrice.toFixed(5)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs px-3 py-2 text-muted-foreground">
                          {position.stopLoss ? position.stopLoss.toFixed(5) : "-"} / {position.takeProfit ? position.takeProfit.toFixed(5) : "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-sm font-medium px-3 py-2 ${
                            position.profit >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {position.profit >= 0 ? "+" : ""}${position.profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {onModifyPosition && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleModify(position)}
                                data-testid={`button-modify-position-${position.id}`}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onClosePosition(position.id)}
                              data-testid={`button-close-position-${position.id}`}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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

      <ModifyDialog
        position={modifyPosition}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onModify={handleModifyConfirm}
      />
    </>
  );
}
