import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, Server, Globe, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectionStatusProps {
  label: string;
  status: "connected" | "disconnected" | "connecting" | "needs_auth";
  onReconnect?: () => void;
}

export function ConnectionStatus({ label, status, onReconnect }: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      color: "bg-status-online",
      text: "Connected",
    },
    disconnected: {
      color: "bg-status-busy",
      text: "Disconnected",
    },
    connecting: {
      color: "bg-status-away",
      text: "Connecting...",
    },
    needs_auth: {
      color: "bg-status-away",
      text: "Auth Required",
    },
  };

  const getIcon = () => {
    switch (label) {
      case "WS": return <Globe className="h-3 w-3" />;
      case "TG": return <Signal className="h-3 w-3" />;
      case "MT": return <Server className="h-3 w-3" />;
      default: return null;
    }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div 
        className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-secondary/50 border border-border"
        title={label === "WS" ? "WebSocket Server" : label === "TG" ? "Telegram" : "MetaTrader API"}
      >
        <div className="flex items-center gap-1 text-muted-foreground">
          {getIcon()}
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <span
          className={`h-2 w-2 rounded-full ${config.color} ${
            status === "connecting" ? "animate-pulse" : ""
          }`}
        />
        {(label === "TG") && onReconnect && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReconnect}
            className="h-5 w-5 md:h-6 md:w-6 no-default-hover-elevate"
            title="Reconnect Telegram"
          >
            <Zap className={`h-3 w-3 ${status === "connected" ? "text-primary" : (status === "disconnected" ? "text-destructive" : "text-muted-foreground")}`} />
          </Button>
        )}
      </div>
    </div>
  );
}

interface StatusBarProps {
  wsStatus: "connected" | "disconnected" | "connecting";
  telegramStatus: "connected" | "disconnected" | "connecting" | "needs_auth";
  metaapiStatus: "connected" | "disconnected" | "connecting";
  onReconnectTelegram?: () => void;
}

export function StatusBar({ wsStatus, telegramStatus, metaapiStatus, onReconnectTelegram }: StatusBarProps) {
  return (
    <div className="flex items-center gap-1 md:gap-4 px-1 md:px-2">
      <ConnectionStatus label="WS" status={wsStatus} />
      <ConnectionStatus label="TG" status={telegramStatus} onReconnect={onReconnectTelegram} />
      <ConnectionStatus label="MT" status={metaapiStatus} />
    </div>
  );
}

// Compact mobile status indicator
export function MobileStatusBar({ wsStatus, telegramStatus, metaapiStatus, onReconnectTelegram }: StatusBarProps) {
  return null;
}
