/**
 * WEBSOCKET SERVER (server/websocket.ts)
 * 
 * This is the central communication hub of the application.
 * It manages real-time bidirectional data flow between the backend and all 
 * connected React frontend clients.
 * 
 * DATA FLOW:
 * 1. Backend -> Frontend: 
 *    - New Telegram messages (via telegram.onMessage)
 *    - AI analysis verdicts (via analyzeMessage)
 *    - MetaAPI account/position updates
 * 2. Frontend -> Backend:
 *    - Telegram auth steps (phone, code, password)
 *    - Channel selection & saved settings
 *    - Trade execution commands (manual or signal-based)
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

const SETTINGS_FILE = path.join(process.cwd(), ".trading_settings.json");
let autoTradeEnabled = false;
let savedChannelId: string | null = null;
let globalLotSize = 0.01;
const processedMessageIds = new Set<string>();
let currentChannelId: string | null = null;

const logBuffer: string[] = [];
const MAX_LOGS = 1000;
const LOG_RETENTION_MS = 30 * 60 * 1000;

function addLog(message: string) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] ${message}`;
  
  // Try to parse as JSON for better display if it looks like JSON
  if (message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      logEntry = JSON.stringify({ timestamp, ...parsed });
    } catch (e) {}
  }

  logBuffer.push(logEntry);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.shift();
  }
  broadcast({ type: "logs", logs: [logEntry] });
}

// Override console.log and console.error to capture logs
const originalLog = console.log;
const originalError = console.error;

console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalLog.apply(console, args);
  addLog(message);
};

console.error = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  originalError.apply(console, args);
  addLog(`ERROR: ${message}`);
};

let savedChannelIds: string[] = [];

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
        // Multi-channel selection
        const channelIds = Array.isArray(data.channelId) ? data.channelId : (data.channelId ? [data.channelId] : []);
        
        console.log(JSON.stringify({
          level: "INFO",
          module: "WEBSOCKET",
          event: "CHANNELS_SELECTED",
          channelIds
        }));

        // Update current local selection for real-time handler
        savedChannelIds = channelIds;
        saveSettings();
        
        // Broadcast the full list to all clients so they stay in sync
        broadcast({ type: "channels_selected", channelIds: savedChannelIds });
        
        // Tell Telegram module which channels we are interested in and get history
        // IMPORTANT: We pass ALL selected channels to ensure we get history for all of them
        const messages = await telegram.selectChannel(savedChannelIds);
        
        // Only show last hour of messages (real-time), skip older history
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentMessages = messages.filter(m => new Date(m.date).getTime() > oneHourAgo);

        console.log(JSON.stringify({
          level: "INFO",
          module: "WEBSOCKET",
          event: "FETCHING_HISTORY",
          count: recentMessages.length,
          channelCount: channelIds.length
        }));

        for (const message of recentMessages) {
          const messageKey = `${message.channelId}:${message.id}`;
          if (!processedMessageIds.has(messageKey)) {
            ws.send(JSON.stringify({ type: "new_message", message: { ...message, isRealtime: false } }));
            processedMessageIds.add(messageKey);
          }
        }
        break;
      }

      case "execute_trade": {
        const signal = signals.get(data.signalId);
        if (signal) {
          // Use signal ID as lock key even for manual execution to prevent collision with auto-trade
          const result = await metaapi.executeTrade(
            data.symbol,
            data.direction,
            data.volume,
            data.stopLoss,
            data.takeProfit,
            data.orderType || "MARKET",
            data.entryPrice,
            signal.id // Use signal.id as lock key
          );

          if (result.success) {
            signal.status = "executed";
            signals.set(signal.id, signal);
            broadcast({ type: "signal_updated", signal });
            broadcast({ type: "trade_result", success: true, message: `${data.direction} ${data.symbol} executed successfully` });
          } else {
            signal.status = "failed";
            signal.failureReason = result.message;
            signals.set(signal.id, signal);
            broadcast({ type: "signal_updated", signal });
            broadcast({ type: "error", message: result.message });
            broadcast({ type: "trade_result", success: false, message: result.message });
          }

          // Refresh positions and account
          const positions = await metaapi.getPositions();
          broadcast({ type: "positions", positions });
          const account = await metaapi.refreshAccount();
          if (account) broadcast({ type: "account_info", account });
        }
        break;
      }

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
          broadcast({ type: "error", message: result.message });
          broadcast({ type: "trade_result", success: false, message: result.message });
        }

        // Refresh positions and account
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
          signals.set(signal.id, signal);
          broadcast({ type: "signal_updated", signal });
        }
        break;
      }

      case "close_position": {
        const result = await metaapi.closePosition(data.positionId);
        if (result.success) {
          broadcast({ type: "position_closed", positionId: data.positionId });
          broadcast({ type: "trade_result", success: true, message: "Position closed successfully" });
        } else {
          broadcast({ type: "error", message: result.message });
          broadcast({ type: "trade_result", success: false, message: result.message });
        }

        // Refresh positions and account
        const positions = await metaapi.getPositions();
        broadcast({ type: "positions", positions });
        const account = await metaapi.refreshAccount();
        if (account) broadcast({ type: "account_info", account });
        break;
      }

      case "modify_position": {
        const result = await metaapi.modifyPosition(
          data.positionId,
          data.stopLoss,
          data.takeProfit
        );
        if (result.success) {
          broadcast({ type: "trade_result", success: true, message: "Position modified successfully" });
        } else {
          broadcast({ type: "error", message: result.message });
          broadcast({ type: "trade_result", success: false, message: result.message });
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

      case "reconnect_telegram": {
        await telegram.reconnect();
        
        // After reconnection, re-select channels to sync messages
        if (savedChannelIds.length > 0) {
          console.log("Re-selecting saved channels after manual reconnect:", savedChannelIds);
          for (const channelId of savedChannelIds) {
            const messages = await telegram.selectChannel(channelId);
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            const recentMessages = messages.filter(m => new Date(m.date).getTime() > oneHourAgo);
            
            for (const message of recentMessages) {
              ws.send(JSON.stringify({ type: "new_message", message: { ...message, isRealtime: false } }));
              // Prevent duplicate broadcast/processing
              const messageKey = `${message.channelId}:${message.id}`;
              processedMessageIds.add(messageKey);
            }
          }
        }
        break;
      }

      case "save_channel": {
        const channelIds = Array.isArray(data.channelId) ? data.channelId : (data.channelId ? [data.channelId] : []);
        savedChannelIds = channelIds;
        saveSettings();
        broadcast({ type: "channels_selected", channelIds: savedChannelIds });
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

      case "disconnect_telegram": {
        await telegram.disconnect();
        processedMessageIds.clear();
        currentChannelId = null;
        broadcast({ type: "telegram_disconnected" });
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
    
    // Create unique key using channel + message ID
    const messageKey = `${message.channelId}:${message.id}`;

    if (processedMessageIds.has(messageKey)) {
      // If it's real-time and we already marked it as analyzing or skipped, don't re-process
      // But if it was historical and now it's real-time, we might want to analyze it?
      // Actually, historical messages are marked as "skipped". 
      // If a message was historical, then real-time arrives (edge case), we skip it.
      return;
    }
    
<<<<<<< HEAD
    // Mark message as being processed to prevent duplicates
    processedMessageIds.add(messageKey);
    console.log(`[WS] Routing ${messageKey}. isRealtime: ${isRealtime}`);

    // Only analyze real-time messages asynchronously, skip historical ones
    if (isRealtime) {
      // Broadcast with "analyzing" state before starting heavy background work
      broadcast({ type: "new_message", message: { ...updatedMessage, aiVerdict: "analyzing" } });

=======
    // Check for duplicate message processing
    if (processedMessageIds.has(messageKey)) {
      console.log(`Skipping duplicate message: ${messageKey}`);
      return;
    }
    
    // For all messages, broadcast immediately (don't wait for analysis)
    if (isRealtime) {
      updatedMessage.aiVerdict = "analyzing";
    }
    broadcast({ type: "new_message", message: updatedMessage });

    // Only analyze real-time messages asynchronously, skip historical ones
    if (isRealtime) {
      // Mark message as being processed to prevent duplicates
      processedMessageIds.add(messageKey);
      
>>>>>>> parent of 4732886... Allow the bot to detect trading signals from multiple Telegram channels simultaneously
      // Limit cache size to prevent memory leaks
      if (processedMessageIds.size > 1000) {
        const idsArray = Array.from(processedMessageIds);
        for (let i = 0; i < 500; i++) {
          processedMessageIds.delete(idsArray[i]);
        }
      }
      
      console.log(JSON.stringify({
        level: "INFO",
        module: "AI",
        event: "ANALYSIS_START",
        messageKey,
        text: message.text?.substring(0, 50)
      }));

      // Don't await - process analysis in background
      analyzeMessage(message).then(({ verdict, verdictDescription, signals: detectedSignals, modelUsed }) => {
        // Create a copy to avoid mutation issues
        const resultMessage = { ...updatedMessage };
        resultMessage.aiVerdict = verdict;
        resultMessage.verdictDescription = verdictDescription;
        resultMessage.modelUsed = modelUsed;
        
        console.log(JSON.stringify({
          level: "INFO",
          module: "AI",
          event: "ANALYSIS_COMPLETE",
          messageKey,
          verdict,
          modelUsed
        }));
        // Broadcast updated message with analysis
        broadcast({ type: "new_message", message: resultMessage });

        if (detectedSignals && detectedSignals.length > 0) {
          detectedSignals.forEach(signal => {
            signal.verdictDescription = verdictDescription;
            signals.set(signal.id, signal);
            broadcast({ type: "signal_detected", signal });

            if (autoTradeEnabled) {
              const tradeParams = {
                symbol: signal.symbol,
                direction: signal.direction,
                volume: globalLotSize,
                stopLoss: signal.stopLoss,
                takeProfit: signal.takeProfit?.[0],
                orderType: signal.orderType === "LIMIT" ? "LIMIT" : "MARKET",
                entryPrice: signal.entryPrice,
                signalId: signal.id
              };
              
              console.log(JSON.stringify({
                level: "INFO",
                module: "MARKETS",
                event: "AUTO_TRADE_START",
                symbol: signal.symbol,
                direction: signal.direction,
                volume: globalLotSize
              }));
              
              metaapi.executeTrade(
                tradeParams.symbol,
                tradeParams.direction,
                tradeParams.volume,
                tradeParams.stopLoss,
                tradeParams.takeProfit,
                tradeParams.orderType as any,
                tradeParams.entryPrice,
                tradeParams.signalId
              ).then(result => {
                if (result.success) {
                  console.log(JSON.stringify({
                    level: "INFO",
                    module: "MARKETS",
                    event: "AUTO_TRADE_SUCCESS",
                    symbol: signal.symbol,
                    result
                  }));
                  signal.status = "executed";
                  signals.set(signal.id, signal);
                  broadcast({ type: "signal_updated", signal });
                  broadcast({ type: "auto_trade_executed", signal, result });
                } else {
                  console.error(JSON.stringify({
                    level: "ERROR",
                    module: "MARKETS",
                    event: "AUTO_TRADE_FAILED",
                    symbol: signal.symbol,
                    error: result.message
                  }));
                  signal.status = "failed";
                  signal.failureReason = result.message;
                  signals.set(signal.id, signal);
                  broadcast({ type: "signal_updated", signal });
                  broadcast({ type: "error", message: `Auto-trade failed: ${result.message}` });
                }

                metaapi.getPositions().then(positions => {
                  broadcast({ type: "positions", positions });
                });
              });
            }
          });
        }
      }).catch(error => {
        console.error(`[AI] Error analyzing ${messageKey}:`, error);
        broadcast({ 
          type: "new_message", 
          message: { ...updatedMessage, aiVerdict: "error", verdictDescription: "AI Analysis background error" } 
        });
      });
    } else {
      // For historical messages, mark as skipped with reason
      updatedMessage.aiVerdict = "skipped";
      updatedMessage.verdictDescription = "Historical message: Skipping AI analysis for non-realtime signals to prevent trading on outdated information. AI analysis is reserved for live signals.";
      broadcast({ type: "new_message", message: updatedMessage });
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

  wsMessage({ type: "saved_channel", channelId: savedChannelIds[0] || null });
  
  // Also broadcast all saved IDs for multi-channel support
  savedChannelIds.forEach(id => {
    wsMessage({ type: "saved_channel", channelId: id });
  });

  wsMessage({ type: "auto_trade_enabled", enabled: autoTradeEnabled });
  wsMessage({ type: "lot_size_updated", lotSize: globalLotSize });
  wsMessage({ type: "channels_selected", channelIds: savedChannelIds });
  
  // Re-emit last hour signals
  signals.forEach((signal) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (new Date(signal.timestamp).getTime() > oneHourAgo) {
      wsMessage({ type: "signal_detected", signal });
    }
  });

  const telegramStatus = telegram.getTelegramStatus();
  wsMessage({ type: "telegram_status", status: telegramStatus });
  wsMessage({ type: "metaapi_status", status: metaapi.getMetaApiStatus() });
  
  // Broadcast saved channels immediately so the client ref is updated before history arrives
  savedChannelIds.forEach(id => {
    wsMessage({ type: "saved_channel", channelId: id });
  });

  if (telegramStatus === "needs_auth") {
    wsMessage({ type: "auth_required" });
    wsMessage({ type: "auth_step", step: "phone" });
  } else if (telegramStatus === "connected") {
    const channels = await telegram.getChannels();
    wsMessage({ type: "channels", channels });

    // Automatically select saved channels on connect if any
    if (savedChannelIds.length > 0) {
      console.log("Automatically selecting saved channels:", savedChannelIds);
      // Tell Telegram module which channels we are interested in
      await telegram.selectChannel(savedChannelIds);

      // Wait for client state to settle (broadcasts sent above)
      setTimeout(async () => {
        console.log("Processing saved channels history after delay:", savedChannelIds);
        for (const channelId of savedChannelIds) {
          try {
            const messages = await telegram.selectChannel(channelId);
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            const recentMessages = messages.filter(m => new Date(m.date).getTime() > oneHourAgo);
            
            console.log(`Sending ${recentMessages.length} recent messages for channel ${channelId}`);
            for (const message of recentMessages) {
              console.log(`Sending historical message from saved channel: ${message.id} from ${message.channelId}`);
              ws.send(JSON.stringify({ type: "new_message", message: { ...message, isRealtime: false } }));
              
              // Prevent duplicate broadcast/processing
              const messageKey = `${message.channelId}:${message.id}`;
              processedMessageIds.add(messageKey);
            }
          } catch (err) {
            console.error(`Error selecting saved channel ${channelId}:`, err);
          }
        }
      }, 1500); // Slightly longer delay to ensure WS is fully stable
    }
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

  // Send buffered logs from the last 30 minutes
  const now = Date.now();
  const recentLogs = logBuffer.filter(log => {
    const logTime = new Date(log.substring(1, 25)).getTime();
    return now - logTime < LOG_RETENTION_MS;
  });
  wsMessage({ type: "logs", logs: recentLogs });

  signals.forEach((signal) => {
    // Only send signals from the last 24 hours to keep UI clean
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    if (new Date(signal.timestamp).getTime() > oneDayAgo) {
      wsMessage({ type: "signal_detected", signal });
    }
  });
}

// Real-time position updates via MetaAPI event handler
metaapi.onPositionsUpdate((positions) => {
  broadcast({ type: "positions", positions });
});

// Periodic history fetch every 2 minutes
setInterval(async () => {
  if (clients.size > 0) {
    try {
      const history = await metaapi.getHistory();
      broadcast({ type: "history", trades: history });
    } catch (e) {
      console.log("History fetch error:", e);
    }
  }
}, 120000);

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket) => {
    console.log("WebSocket client connected");
    clients.add(ws);

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (!message || typeof message !== 'object' || !message.type) {
          console.error("Invalid WebSocket message format");
          return;
        }
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
<<<<<<< HEAD
    console.log(`[TG] Received real-time message: ${message.channelId}:${message.id}`);
    const messageKey = `${message.channelId}:${message.id}`;
    if (processedMessageIds.has(messageKey)) {
      console.log(`[TG] Skipping early broadcast of duplicate message: ${messageKey}`);
      return;
    }
=======
    console.log(`Received real-time message from Telegram: ${message.channelId}:${message.id}`);
>>>>>>> parent of 4732886... Allow the bot to detect trading signals from multiple Telegram channels simultaneously
    const realtimeMessage = { ...message, isRealtime: true };
    
    // Broadcast immediately to all connected clients
    broadcast({ type: "new_message", message: realtimeMessage });
    
    // Process for AI analysis and auto-trading
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
