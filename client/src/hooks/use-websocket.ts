import { useEffect, useState, useCallback, useRef } from "react";
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
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);

  useEffect(() => {
    selectedIdsRef.current = selectedChannelIds;
  }, [selectedChannelIds]);
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
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);
  const [savedChannelId, setSavedChannelId] = useState<string | null>(null);
  const [tradeResult, setTradeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lotSize, setLotSize] = useState(0.01);

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
            const currentSelected = selectedIdsRef.current;
            // Log incoming message for debugging
            console.log("Incoming message:", message.message.channelId, message.message.id, "IsRealtime:", message.message.isRealtime);
            
            // Only add messages from selected channels
            const isSelected = currentSelected.includes(message.message.channelId);
            
            // Check for loose match if direct ID match fails (handling -100 prefix inconsistency)
            const incomingNum = message.message.channelId.replace("-100", "").replace("-", "");
            const looseMatch = !isSelected && currentSelected.some((id: string) => {
              const targetNum = id.replace("-100", "").replace("-", "");
              return targetNum === incomingNum;
            });

            if (!isSelected && !looseMatch) {
              console.log("Skipping message - channel not selected:", message.message.channelId, "Selected:", currentSelected, "IncomingNum:", incomingNum);
              return prev;
            }
            const exists = prev.some((m) => m.id === message.message.id);
            if (exists) {
              console.log("Updating existing message:", message.message.id);
              return prev.map((m) =>
                m.id === message.message.id ? message.message : m
              );
            }
            // Play sound for real-time messages
            if (message.message.isRealtime) {
              const channelName = channels.find(c => c.id === message.message.channelId)?.title || 'Channel';
              playNotificationSound(`New message in ${channelName}`);
            }
            // console.log("Adding new message to feed:", message.message.id);
            return [message.message, ...prev].slice(0, 100);
          });
          break;
        case "signal_detected":
          setSignals((prev) => {
            const exists = prev.some(s => s.id === message.signal.id);
            if (exists) return prev;
            return [message.signal, ...prev].slice(0, 50);
          });
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
        case "saved_channel":
          if (message.channelId) {
            console.log("Setting saved channel:", message.channelId);
            setSelectedChannelIds(prev => {
              const currentIds = Array.isArray(prev) ? prev : [];
              if (currentIds.includes(message.channelId!)) return currentIds;
              const next = [...currentIds, message.channelId!];
              selectedIdsRef.current = next;
              return next;
            });
          }
          break;
        case "auto_trade_enabled":
          setAutoTradeEnabled(message.enabled);
          break;
        case "auto_trade_executed":
          playNotificationSound(`Auto Trade Executed: ${message.symbol} ${message.direction}`);
          break;
        case "trade_result":
          setTradeResult({ success: message.success, message: message.message });
          if (message.success) {
            playNotificationSound(message.message);
          } else {
            playNotificationSound(`Trade Failed: ${message.message}`);
          }
          setTimeout(() => setTradeResult(null), 5000);
          break;
        case "lot_size_updated":
          setLotSize(message.lotSize);
          break;
        case "telegram_disconnected":
          setTelegramStatus("disconnected");
          setChannels([]);
          setSelectedChannelIds([]);
          setMessages([]);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const selectChannel = useCallback((channelId: string) => {
    setSelectedChannelIds(prev => {
      const isDeselecting = prev.includes(channelId);
      const next = isDeselecting
        ? prev.filter(id => id !== channelId) 
        : [...prev, channelId];
      
      // If deselecting, clear messages from that channel
      if (isDeselecting) {
        setMessages(current => current.filter(m => m.channelId !== channelId));
      }
      
      wsClient.send({ type: "select_channel", channelId: next });
      wsClient.send({ type: "save_channel", channelId: next.length > 0 ? next[0] : null });
      return next;
    });
  }, []);

  const toggleAutoTrade = useCallback((enabled: boolean) => {
    wsClient.send({ type: "toggle_auto_trade", enabled });
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

  const modifyPosition = useCallback(
    (positionId: string, stopLoss?: number, takeProfit?: number) => {
      wsClient.send({
        type: "modify_position",
        positionId,
        stopLoss,
        takeProfit,
      });
    },
    []
  );

  const updateLotSize = useCallback((size: number) => {
    wsClient.send({ type: "set_lot_size", lotSize: size });
  }, []);

  const disconnectTelegram = useCallback(() => {
    wsClient.send({ type: "disconnect_telegram" });
  }, []);

  const reconnectTelegram = useCallback(() => {
    wsClient.send({ type: "select_channel", channelId: selectedChannelIds });
  }, [selectedChannelIds]);

  return {
    connectionStatus,
    telegramStatus,
    metaapiStatus,
    channels,
    selectedChannelIds,
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
    autoTradeEnabled,
    savedChannelId,
    selectChannel,
    toggleAutoTrade,
    executeTrade,
    dismissSignal,
    closePosition,
    submitAuthCode,
    submitPhoneNumber,
    submitPassword,
    manualTrade,
    modifyPosition,
    tradeResult,
    lotSize,
    updateLotSize,
    disconnectTelegram,
    reconnectTelegram,
  };
}

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

// Register service worker for background notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/notification-worker.js')
    .then((registration) => {
      serviceWorkerRegistration = registration;
      console.log('Notification service worker registered');
    })
    .catch((error) => {
      console.log('Service worker registration failed:', error);
    });
}

function playNotificationSound(message?: string) {
  // Try Web Audio API first (works when tab is active)
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    console.log("Web Audio not available");
  }
  
  // Also try Service Worker notification for background support
  if (serviceWorkerRegistration && Notification.permission === 'granted') {
    serviceWorkerRegistration.active?.postMessage({
      type: 'PLAY_SOUND',
      message: message || 'New trading activity'
    });
  } else if (Notification.permission === 'default') {
    // Request permission if not yet decided
    Notification.requestPermission();
  }
}
