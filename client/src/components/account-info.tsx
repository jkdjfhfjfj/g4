import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Shield, Percent } from "lucide-react";
import type { TradingAccount } from "@shared/schema";

interface AccountInfoProps {
  account: TradingAccount | null;
}

export function AccountInfo({ account }: AccountInfoProps) {
  if (!account) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Trading Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Connecting to MetaTrader...
          </div>
        </CardContent>
      </Card>
    );
  }

  const profitLoss = account.equity - account.balance;
  const profitPercent = account.balance > 0 ? (profitLoss / account.balance) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {account.name}
          </CardTitle>
          <Badge variant={account.connected ? "default" : "secondary"} className="text-xs">
            {account.connected ? "Live" : "Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance</p>
            <p className="text-lg font-semibold font-mono">
              {account.currency} {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Equity</p>
            <p className="text-lg font-semibold font-mono">
              {account.currency} {account.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">P/L</span>
          </div>
          <span
            className={`text-sm font-medium font-mono ${
              profitLoss >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {profitLoss >= 0 ? "+" : ""}
            {account.currency} {profitLoss.toFixed(2)} ({profitPercent >= 0 ? "+" : ""}
            {profitPercent.toFixed(2)}%)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Margin</p>
            <p className="text-xs font-medium font-mono">{account.margin.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Free</p>
            <p className="text-xs font-medium font-mono">{account.freeMargin.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Leverage</p>
            <p className="text-xs font-medium font-mono">1:{account.leverage}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
