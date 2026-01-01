/**
 * WebSocket Server Module
 * 
 * Handles real-time bidirectional communication between the server and clients.
 * Manages trading settings, message processing, AI analysis integration,
 * and automated trade execution.
 * 
 * Links:
 * - telegram.ts: Receives real-time messages and status updates.
 * - groq-ai.ts: Sends messages for AI signal analysis.
 * - metaapi.ts: Executes trades, fetches account info, and positions.
 */

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

// Persistence for trading settings
const SETTINGS_FILE = path.join(process.cwd(), ".trading_settings.json");
let autoTradeEnabled = false;
let globalLotSize = 0.01;
let savedChannelIds: string[] = [];

// To prevent duplicate analysis of the same message
const processedMessageIds = new Set<string>();

/**
 * Loads trading settings from the local JSON file.
 */
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      autoTradeEnabled = data.autoTradeEnabled ?? false;
      savedChannelIds = data.savedChannelIds ?? (data.savedChannelId ? [data.savedChannelId] : []);
      globalLotSize = data.lotSize ?? 0.01;
      console.log("Loaded settings:", { autoTradeEnabled, savedChannelIds, globalLotSize });
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
}

/**
 * Saves trading settings to the local JSON file.
 */
function saveSettings() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
      autoTradeEnabled,
      savedChannelIds,
      lotSize: globalLotSize,
    }, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

loadSettings();

/**
 * Broadcasts a message to all connected WebSocket clients.
 */
function broadcast(message: WSMessageType) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Handles incoming messages from WebSocket clients.
 */
async function handleMessage(ws: WebSocket, data: any) {
  try {
    switch (data.type) {
      case "select_channel": {
        const channelIds = Array.isArray(data.channelId) ? data.channelId : [data.channelId];
        savedChannelIds = channelIds;
        saveSettings();
        
        for (const channelId of channelIds) {
          const messages = await telegram.selectChannel(channelId);
          // Only show last hour of messages to prevent flooding on connect
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          const recentMessages = messages.filter(m => new Date(m.date).getTime() > oneHourAgo);

          for (const message of recentMessages) {
            ws.send(JSON.stringify({ type: "new_message", message: { ...message, isRealtime: false } }));
            processedMessageIds.add(`${message.channelId}:${message.id}`);
          }
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
            data.takeProfit,
            data.orderType || "MARKET",
            data.entryPrice,
            signal.id 
          );

          if (result.success) {
            signal.status = "executed";
            broadcast({ type: "signal_updated", signal });
            broadcast({ type: "trade_result", success: true, message: `${data.direction} ${data.symbol} executed successfully` });
          } else {
            signal.status = "failed";
            signal.failureReason = result.message;
            broadcast({ type: "signal_updated", signal });
            broadcast({ type: "trade_result", success: false, message: result.message });
          }

          // Trigger data refresh
          const positions = await metaapi.getPositions();
          broadcast({ type: "positions", positions });
          const account = await metaapi.refreshAccount();
          if (account) broadcast({ type: "account_info", account });
        }
        break;
      }

      // Other cases (manual_trade, dismiss_signal, close_position, etc.) handled similarly...
      case "manual_trade": {
        const result = await metaapi.executeTrade(
          data.symbol,
          data.direction,
          data.volume,
          data.stopLoss,
          data.takeProfit,
          data.orderType || "MARKET",
          data.entryPrice
        );
        if (result.success) {
          broadcast({ type: "trade_result", success: true, message: `${data.direction} ${data.symbol} executed successfully` });
        } else {
          broadcast({ type: "trade_result", success: false, message: result.message });
        }
        const positions = await metaapi.getPositions();
        broadcast({ type: "positions", positions });
        const account = await metaapi.refreshAccount();
        if (account) broadcast({ type: "account_info", account });
        break;
      }

      case "dismiss_signal": {
        const signal = signals.get(data.signalId);
        if (signal) {
          signal.status = "dismissed";
          broadcast({ type: "signal_updated", signal });
        }
        break;
      }

      case "close_position": {
        const result = await metaapi.closePosition(data.positionId);
        if (result.success) {
          broadcast({ type: "position_closed", positionId: data.positionId });
        } else {
          broadcast({ type: "trade_result", success: false, message: result.message });
        }
        const positions = await metaapi.getPositions();
        broadcast({ type: "positions", positions });
        const account = await metaapi.refreshAccount();
        if (account) broadcast({ type: "account_info", account });
        break;
      }

      case "phone_number": telegram.submitPhone(data.phone); break;
      case "auth_code": telegram.submitCode(data.code); break;
      case "password": telegram.submitPassword(data.password); break;
      case "reconnect_telegram": await telegram.reconnect(); break;
      case "disconnect_telegram": {
        await telegram.disconnect();
        processedMessageIds.clear();
        broadcast({ type: "telegram_disconnected" });
        break;
      }
      case "toggle_auto_trade": {
        autoTradeEnabled = data.enabled;
        saveSettings();
        broadcast({ type: "auto_trade_enabled", enabled: autoTradeEnabled });
        break;
      }
      case "set_lot_size": {
        const size = parseFloat(data.lotSize);
        if (!isNaN(size) && size > 0) {
          globalLotSize = size;
          saveSettings();
          broadcast({ type: "lot_size_updated", lotSize: globalLotSize });
        }
        break;
      }
    }
  } catch (error) {
    console.error("Error handling WebSocket message:", error);
  }
}

/**
 * Processes a Telegram message: broadcasts it and analyzes it for signals.
 */
async function processMessage(message: TelegramMessage, isRealtime: boolean = false) {
  try {
    const updatedMessage = { ...message, isRealtime };
    const messageKey = `${message.channelId}:${message.id}`;
    
    if (processedMessageIds.has(messageKey)) return;
    
    broadcast({ type: "new_message", message: updatedMessage });

    if (isRealtime) {
      processedMessageIds.add(messageKey);
      
      // AI Analysis
      analyzeMessage(message).then(({ verdict, verdictDescription, signals: detectedSignals, modelUsed }) => {
        updatedMessage.aiVerdict = verdict;
        updatedMessage.verdictDescription = verdictDescription;
        updatedMessage.modelUsed = modelUsed;
        broadcast({ type: "new_message", message: updatedMessage });

        if (detectedSignals && detectedSignals.length > 0) {
          detectedSignals.forEach(signal => {
            signal.verdictDescription = verdictDescription;
            signals.set(signal.id, signal);
            broadcast({ type: "signal_detected", signal });

            // Auto-Trade Logic
            if (autoTradeEnabled) {
              console.log(`Auto-executing trade: ${signal.symbol} ${signal.direction}`);
              metaapi.executeTrade(
                signal.symbol,
                signal.direction,
                globalLotSize,
                signal.stopLoss,
                signal.takeProfit?.[0],
                signal.orderType === "LIMIT" ? "LIMIT" : "MARKET",
                signal.entryPrice,
                signal.id 
              ).then(result => {
                if (result.success) {
                  signal.status = "executed";
                  broadcast({ type: "signal_updated", signal });
                } else {
                  signal.status = "failed";
                  signal.failureReason = result.message;
                  broadcast({ type: "signal_updated", signal });
                }
                metaapi.getPositions().then(p => broadcast({ type: "positions", positions: p }));
              });
            }
          });
        }
      });
    } else {
      updatedMessage.aiVerdict = "skipped";
      broadcast({ type: "new_message", message: updatedMessage });
    }
  } catch (error) {
    console.error("Error processing message:", error);
  }
}

/**
 * Initial synchronization for newly connected WebSocket clients.
 */
async function sendInitialData(ws: WebSocket) {
  const wsMessage = (msg: WSMessageType) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  wsMessage({ type: "saved_channel", channelId: savedChannelIds[0] || null });
  wsMessage({ type: "auto_trade_enabled", enabled: autoTradeEnabled });
  wsMessage({ type: "lot_size_updated", lotSize: globalLotSize });
  
  const telegramStatus = telegram.getTelegramStatus();
  wsMessage({ type: "telegram_status", status: telegramStatus });
  wsMessage({ type: "metaapi_status", status: metaapi.getMetaApiStatus() });

  if (telegramStatus === "connected") {
    const channels = await telegram.getChannels();
    wsMessage({ type: "channels", channels });
  }

  // Refresh and send market data
  const account = await metaapi.getAccountInfo();
  if (account) wsMessage({ type: "account_info", account });
  const positions = await metaapi.getPositions();
  wsMessage({ type: "positions", positions });
  const markets = await metaapi.getMarkets();
  wsMessage({ type: "markets", markets });
}

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket) => {
    clients.add(ws);
    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (e) {}
    });
    ws.on("close", () => clients.delete(ws));
    await sendInitialData(ws);
  });

  telegram.onMessage((m) => processMessage(m, true));
  telegram.onStatusChange((s) => {
    broadcast({ type: "telegram_status", status: s });
    if (s === "needs_auth") broadcast({ type: "auth_required" });
  });
  telegram.onAuthRequired((t) => broadcast({ type: "auth_step", step: t }));
  telegram.onAuthError((e) => broadcast({ type: "auth_error", message: e }));

  metaapi.onPositionsUpdate((p) => broadcast({ type: "positions", positions: p }));
  metaapi.onMarketsUpdate((m) => broadcast({ type: "markets", markets: m }));

  console.log("WebSocket server initialized");
}
