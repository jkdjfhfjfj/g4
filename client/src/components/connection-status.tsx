import { Badge } from "@/components/ui/badge";
import { RefreshCw, Power } from "lucide-react";
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

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${config.color} ${
            status === "connecting" ? "animate-pulse" : ""
          }`}
        />
        <span className="text-xs font-medium">{config.text}</span>
        {label === "Telegram" && status === "disconnected" && onReconnect && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onReconnect}
            className="h-6 w-6 ml-1"
            title="Reconnect Telegram"
          >
            <Power className="h-3 w-3" />
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
    <div className="hidden md:flex items-center gap-4">
      <ConnectionStatus label="WS" status={wsStatus} />
      <ConnectionStatus label="Telegram" status={telegramStatus} onReconnect={onReconnectTelegram} />
      <ConnectionStatus label="MetaAPI" status={metaapiStatus} />
    </div>
  );
}

// Compact mobile status indicator
export function MobileStatusBar({ wsStatus, telegramStatus, metaapiStatus, onReconnectTelegram }: StatusBarProps) {
  const getOverallStatus = () => {
    if (wsStatus === "connected" && telegramStatus === "connected" && metaapiStatus === "connected") {
      return { color: "bg-status-online", text: "All Connected" };
    }
    if (wsStatus === "disconnected" || telegramStatus === "disconnected" || metaapiStatus === "disconnected") {
      return { color: "bg-status-busy", text: "Some Offline" };
    }
    return { color: "bg-status-away", text: "Connecting..." };
  };

  const status = getOverallStatus();

  return (
    <div className="md:hidden flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${status.color} ${
          wsStatus === "connecting" || telegramStatus === "connecting" || metaapiStatus === "connecting" ? "animate-pulse" : ""
        }`}
      />
      <span className="text-xs font-medium">{status.text}</span>
      {telegramStatus === "disconnected" && onReconnectTelegram && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onReconnectTelegram}
          className="h-6 w-6 ml-1"
        >
          <Power className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
