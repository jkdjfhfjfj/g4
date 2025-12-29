import { useEffect, useState, useCallback } from "react";
import { wsClient } from "@/lib/websocket";
import type {
  WSMessageType,
  TelegramChannel,
  TelegramMessage,
  ParsedSignal,
  TradingAccount,
  Position,
  MarketSymbol,
  TradeHistory,
} from "@shared/schema";

export function useWebSocket() {
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [telegramStatus, setTelegramStatus] = useState<
    "connected" | "disconnected" | "connecting" | "needs_auth"
  >("disconnected");
  const [metaapiStatus, setMetaapiStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [signals, setSignals] = useState<ParsedSignal[]>([]);
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [markets, setMarkets] = useState<MarketSymbol[]>([]);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [authStep, setAuthStep] = useState<'phone' | 'code' | 'password' | 'done'>('phone');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((message: WSMessageType) => {
      switch (message.type) {
        case "connection_status":
          setConnectionStatus(message.status);
          break;
        case "telegram_status":
          setTelegramStatus(message.status);
          if (message.status === "needs_auth") {
            setAuthRequired(true);
          } else {
            setAuthRequired(false);
          }
          break;
        case "metaapi_status":
          setMetaapiStatus(message.status);
          break;
        case "channels":
          setChannels(message.channels);
          break;
        case "new_message":
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === message.message.id);
            if (exists) {
              return prev.map((m) =>
                m.id === message.message.id ? message.message : m
              );
            }
            return [message.message, ...prev].slice(0, 100);
          });
          break;
        case "signal_detected":
          setSignals((prev) => [message.signal, ...prev].slice(0, 50));
          break;
        case "signal_updated":
          setSignals((prev) =>
            prev.map((s) => (s.id === message.signal.id ? message.signal : s))
          );
          break;
        case "account_info":
          setAccount(message.account);
          break;
        case "positions":
          setPositions(message.positions);
          break;
        case "position_update":
          setPositions((prev) => {
            const exists = prev.some((p) => p.id === message.position.id);
            if (exists) {
              return prev.map((p) =>
                p.id === message.position.id ? message.position : p
              );
            }
            return [...prev, message.position];
          });
          break;
        case "position_closed":
          setPositions((prev) => prev.filter((p) => p.id !== message.positionId));
          break;
        case "markets":
          setMarkets(message.markets);
          break;
        case "history":
          setHistory(message.trades);
          break;
        case "error":
          setError(message.message);
          setTimeout(() => setError(null), 5000);
          break;
        case "auth_required":
          setAuthRequired(true);
          setAuthStep('phone');
          setAuthError(null);
          break;
        case "auth_step":
          setAuthStep(message.step);
          setAuthError(null);
          if (message.step === 'done') {
            setAuthRequired(false);
          }
          break;
        case "auth_error":
          setAuthError(message.message);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelId(channelId);
    setMessages([]);
    wsClient.send({ type: "select_channel", channelId });
  }, []);

  const executeTrade = useCallback(
    (signalId: string, volume: number, stopLoss?: number, takeProfit?: number) => {
      const signal = signals.find((s) => s.id === signalId);
      if (!signal) return;

      wsClient.send({
        type: "execute_trade",
        signalId,
        symbol: signal.symbol,
        direction: signal.direction,
        volume,
        stopLoss,
        takeProfit,
      });
    },
    [signals]
  );

  const dismissSignal = useCallback((signalId: string) => {
    wsClient.send({ type: "dismiss_signal", signalId });
    setSignals((prev) =>
      prev.map((s) => (s.id === signalId ? { ...s, status: "dismissed" as const } : s))
    );
  }, []);

  const closePosition = useCallback((positionId: string) => {
    wsClient.send({ type: "close_position", positionId });
  }, []);

  const submitAuthCode = useCallback((code: string) => {
    wsClient.send({ type: "auth_code", code });
  }, []);

  const submitPhoneNumber = useCallback((phone: string) => {
    wsClient.send({ type: "phone_number", phone });
  }, []);

  const submitPassword = useCallback((password: string) => {
    wsClient.send({ type: "password", password });
  }, []);

  const manualTrade = useCallback(
    (symbol: string, direction: "BUY" | "SELL", volume: number, stopLoss?: number, takeProfit?: number) => {
      wsClient.send({
        type: "manual_trade",
        symbol,
        direction,
        volume,
        stopLoss,
        takeProfit,
      });
    },
    []
  );

  return {
    connectionStatus,
    telegramStatus,
    metaapiStatus,
    channels,
    selectedChannelId,
    messages,
    signals,
    account,
    positions,
    markets,
    history,
    error,
    authRequired,
    authStep,
    authError,
    selectChannel,
    executeTrade,
    dismissSignal,
    closePosition,
    submitAuthCode,
    submitPhoneNumber,
    submitPassword,
    manualTrade,
  };
}
