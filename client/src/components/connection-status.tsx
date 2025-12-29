import { Badge } from "@/components/ui/badge";

interface ConnectionStatusProps {
  label: string;
  status: "connected" | "disconnected" | "connecting" | "needs_auth";
}

export function ConnectionStatus({ label, status }: ConnectionStatusProps) {
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
      </div>
    </div>
  );
}

interface StatusBarProps {
  wsStatus: "connected" | "disconnected" | "connecting";
  telegramStatus: "connected" | "disconnected" | "connecting" | "needs_auth";
  metaapiStatus: "connected" | "disconnected" | "connecting";
}

export function StatusBar({ wsStatus, telegramStatus, metaapiStatus }: StatusBarProps) {
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

  return (
    <div className="hidden md:flex items-center gap-4">
      <ConnectionStatus label="WS" status={wsStatus} />
      <ConnectionStatus label="Telegram" status={telegramStatus} />
      <ConnectionStatus label="MetaAPI" status={metaapiStatus} />
    </div>
  );
}

// Compact mobile status indicator
export function MobileStatusBar({ wsStatus, telegramStatus, metaapiStatus }: StatusBarProps) {
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
    </div>
  );
}
