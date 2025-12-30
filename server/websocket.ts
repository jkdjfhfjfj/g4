import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type {
  WSMessageType,
  TelegramMessage,
  ParsedSignal,
} from "@shared/schema";
import * as telegram from "./telegram";
import * as metaapi from "./metaapi";
import { analyzeMessage } from "./groq-ai";
import * as fs from "fs";
import * as path from "path";

let wss: WebSocketServer | null = null;
const clients: Set<WebSocket> = new Set();
const signals: Map<string, ParsedSignal> = new Map();

const SETTINGS_FILE = path.join(process.cwd(), ".trading_settings.json");
let autoTradeEnabled = false;
let savedChannelId: string | null = null;
const DEFAULT_TRADE_VOLUME = 0.01;

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      autoTradeEnabled = data.autoTradeEnabled ?? false;
      savedChannelId = data.savedChannelId ?? null;
      console.log("Loaded settings:", { autoTradeEnabled, savedChannelId });
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
      autoTradeEnabled,
      savedChannelId,
    }, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

loadSettings();

function broadcast(message: WSMessageType) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

async function handleMessage(ws: WebSocket, data: any) {
  try {
    switch (data.type) {
      case "select_channel": {
        const messages = await telegram.selectChannel(data.channelId);
        
        // Only show last hour of messages (real-time), skip older history
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentMessages = messages.filter(m => new Date(m.date).getTime() > oneHourAgo);

        for (const message of recentMessages) {
          const realtimeMessage = { ...message, isRealtime: false };
          broadcast({ type: "new_message", message: realtimeMessage });
        }

        for (const message of recentMessages) {
          processMessage({ ...message, isRealtime: false }, false);
        }
        break;
      }

      case "execute_trade": {
        const signal = signals.get(data.signalId);
        if (signal) {
          const result = await metaapi.executeTrade(
            data.symbol,
            data.direction,
            data.volume,
            data.stopLoss,
            data.takeProfit
          );

          if (result.success) {
            signal.status = "executed";
            signals.set(signal.id, signal);
            broadcast({ type: "signal_updated", signal });
          } else {
            signal.status = "failed";
            signals.set(signal.id, signal);
            broadcast({ type: "signal_updated", signal });
            broadcast({ type: "error", message: result.message });
          }

          // Refresh positions
          const positions = await metaapi.getPositions();
          broadcast({ type: "positions", positions });
        }
        break;
      }

      case "manual_trade": {
        const result = await metaapi.executeTrade(
          data.symbol,
          data.direction,
          data.volume,
          data.stopLoss,
          data.takeProfit
        );

        if (!result.success) {
          broadcast({ type: "error", message: result.message });
        }

        // Refresh positions
        const positions = await metaapi.getPositions();
        broadcast({ type: "positions", positions });
        break;
      }

      case "dismiss_signal": {
        const signal = signals.get(data.signalId);
        if (signal) {
          signal.status = "dismissed";
          signals.set(signal.id, signal);
          broadcast({ type: "signal_updated", signal });
        }
        break;
      }

      case "close_position": {
        const result = await metaapi.closePosition(data.positionId);
        if (result.success) {
          broadcast({ type: "position_closed", positionId: data.positionId });
        } else {
          broadcast({ type: "error", message: result.message });
        }

        // Refresh positions
        const positions = await metaapi.getPositions();
        broadcast({ type: "positions", positions });
        break;
      }

      case "phone_number": {
        telegram.submitPhone(data.phone);
        break;
      }

      case "auth_code": {
        telegram.submitCode(data.code);
        break;
      }

      case "password": {
        telegram.submitPassword(data.password);
        break;
      }

      case "save_channel": {
        savedChannelId = data.channelId;
        saveSettings();
        broadcast({ type: "saved_channel", channelId: savedChannelId });
        break;
      }

      case "toggle_auto_trade": {
        autoTradeEnabled = data.enabled;
        saveSettings();
        broadcast({ type: "auto_trade_enabled", enabled: autoTradeEnabled });
        break;
      }
    }
  } catch (error) {
    console.error("Error handling WebSocket message:", error);
    broadcast({
      type: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function processMessage(message: TelegramMessage, isRealtime: boolean = false) {
  try {
    const updatedMessage = { ...message, isRealtime };
    
    // For all messages, broadcast immediately (don't wait for analysis)
    broadcast({ type: "new_message", message: updatedMessage });

    // Only analyze real-time messages asynchronously, skip historical ones
    if (isRealtime) {
      // Don't await - process analysis in background
      analyzeMessage(message).then(({ verdict, verdictDescription, signal }) => {
        updatedMessage.aiVerdict = verdict;
        updatedMessage.verdictDescription = verdictDescription;
        
        // Broadcast updated message with analysis
        broadcast({ type: "new_message", message: updatedMessage });

        if (signal) {
          updatedMessage.parsedSignal = signal;
          signals.set(signal.id, signal);
          broadcast({ type: "signal_detected", signal });

          if (autoTradeEnabled && signal.confidence >= 0.7) {
            console.log(`Auto-executing trade: ${signal.symbol} ${signal.direction} (confidence: ${signal.confidence})`);
            
            // Auto-execute in background
            metaapi.executeTrade(
              signal.symbol,
              signal.direction,
              DEFAULT_TRADE_VOLUME,
              signal.stopLoss,
              signal.takeProfit?.[0]
            ).then(result => {
              if (result.success) {
                signal.status = "executed";
                signals.set(signal.id, signal);
                broadcast({ type: "signal_updated", signal });
                broadcast({ type: "auto_trade_executed", signal, result });
              } else {
                signal.status = "failed";
                signals.set(signal.id, signal);
                broadcast({ type: "signal_updated", signal });
                broadcast({ type: "error", message: `Auto-trade failed: ${result.message}` });
              }

              metaapi.getPositions().then(positions => {
                broadcast({ type: "positions", positions });
              });
            });
          }
        }
      }).catch(error => {
        console.error("Background analysis error:", error);
        updatedMessage.aiVerdict = "error";
        updatedMessage.verdictDescription = "Analysis timeout or error";
        broadcast({ type: "new_message", message: updatedMessage });
      });
    }
  } catch (error) {
    console.error("Error processing message:", error);
    const updatedMessage = { ...message, aiVerdict: "error" as const, verdictDescription: "Processing error", isRealtime };
    broadcast({ type: "new_message", message: updatedMessage });
  }
}

async function sendInitialData(ws: WebSocket) {
  const wsMessage = (msg: WSMessageType) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  wsMessage({ type: "saved_channel", channelId: savedChannelId });
  wsMessage({ type: "auto_trade_enabled", enabled: autoTradeEnabled });

  const telegramStatus = telegram.getTelegramStatus();
  wsMessage({ type: "telegram_status", status: telegramStatus });
  wsMessage({ type: "metaapi_status", status: metaapi.getMetaApiStatus() });
  
  if (telegramStatus === "needs_auth") {
    wsMessage({ type: "auth_required" });
    wsMessage({ type: "auth_step", step: "phone" });
  } else if (telegramStatus === "connected") {
    const channels = await telegram.getChannels();
    wsMessage({ type: "channels", channels });
  }

  const account = await metaapi.getAccountInfo();
  if (account) {
    wsMessage({ type: "account_info", account });
  }

  const positions = await metaapi.getPositions();
  wsMessage({ type: "positions", positions });

  const markets = await metaapi.getMarkets();
  wsMessage({ type: "markets", markets });

  const history = await metaapi.getHistory();
  wsMessage({ type: "history", trades: history });

  signals.forEach((signal) => {
    wsMessage({ type: "signal_detected", signal });
  });
}

// Real-time position updates via MetaAPI event handler
metaapi.onPositionsUpdate((positions) => {
  broadcast({ type: "positions", positions });
});

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket) => {
    console.log("WebSocket client connected");
    clients.add(ws);

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });

    // Send initial data
    await sendInitialData(ws);
  });

  // Set up Telegram message handler for REAL-TIME messages
  telegram.onMessage(async (message) => {
    const realtimeMessage = { ...message, isRealtime: true };
    broadcast({ type: "new_message", message: realtimeMessage });
    processMessage(realtimeMessage, true);
  });

  // Set up real-time market data updates via MetaAPI
  metaapi.onMarketsUpdate((markets) => {
    broadcast({ type: "markets", markets });
  });

  // Set up Telegram status handler
  telegram.onStatusChange(async (status) => {
    broadcast({ type: "telegram_status", status });
    if (status === "needs_auth") {
      broadcast({ type: "auth_required" });
    } else if (status === "connected") {
      broadcast({ type: "auth_step", step: "done" });
      // Fetch and broadcast channels after successful authentication
      const channels = await telegram.getChannels();
      broadcast({ type: "channels", channels });
    }
  });

  // Set up Telegram auth handler
  telegram.onAuthRequired((authType) => {
    broadcast({ type: "auth_step", step: authType });
  });

  // Set up Telegram auth error handler
  telegram.onAuthError((errorMessage) => {
    broadcast({ type: "auth_error", message: errorMessage });
  });

  // Set up MetaAPI status handler
  metaapi.onStatusChange((status) => {
    broadcast({ type: "metaapi_status", status });
  });

  // Set up MetaAPI positions handler
  metaapi.onPositionsUpdate((positions) => {
    broadcast({ type: "positions", positions });
  });

  // Periodic updates
  setInterval(async () => {
    // Update account info
    const account = await metaapi.getAccountInfo();
    if (account) {
      broadcast({ type: "account_info", account });
    }

    // Update markets
    const markets = await metaapi.getMarkets();
    broadcast({ type: "markets", markets });
  }, 10000);

  console.log("WebSocket server initialized");
}
