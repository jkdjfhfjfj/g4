import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Briefcase, TrendingUp, TrendingDown, X } from "lucide-react";
import type { Position } from "@shared/schema";

interface PositionsPanelProps {
  positions: Position[];
  onClosePosition: (positionId: string) => void;
}

export function PositionsPanel({ positions, onClosePosition }: PositionsPanelProps) {
  const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);

  return (
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
                    <TableHead className="text-xs text-right px-3 py-2">P/L</TableHead>
                    <TableHead className="text-xs px-3 py-2"></TableHead>
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
                      <TableCell
                        className={`text-right font-mono text-sm font-medium px-3 py-2 ${
                          position.profit >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {position.profit >= 0 ? "+" : ""}${position.profit.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onClosePosition(position.id)}
                          data-testid={`button-close-position-${position.id}`}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
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
