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

let wss: WebSocketServer | null = null;
const clients: Set<WebSocket> = new Set();
const signals: Map<string, ParsedSignal> = new Map();

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
        
        // Send initial messages
        for (const message of messages) {
          broadcast({ type: "new_message", message });
        }

        // Analyze messages for signals
        for (const message of messages) {
          processMessage(message);
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
    }
  } catch (error) {
    console.error("Error handling WebSocket message:", error);
    broadcast({
      type: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function processMessage(message: TelegramMessage) {
  try {
    const { verdict, signal } = await analyzeMessage(message);
    
    // Update message with verdict
    const updatedMessage = { ...message, aiVerdict: verdict };
    broadcast({ type: "new_message", message: updatedMessage });

    // If signal detected, add to signals list
    if (signal) {
      updatedMessage.parsedSignal = signal;
      signals.set(signal.id, signal);
      broadcast({ type: "signal_detected", signal });
    }
  } catch (error) {
    console.error("Error processing message:", error);
    const updatedMessage = { ...message, aiVerdict: "error" as const };
    broadcast({ type: "new_message", message: updatedMessage });
  }
}

async function sendInitialData(ws: WebSocket) {
  // Send current status
  const wsMessage = (msg: WSMessageType) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  wsMessage({ type: "telegram_status", status: telegram.getTelegramStatus() });
  wsMessage({ type: "metaapi_status", status: metaapi.getMetaApiStatus() });

  // Send channels
  const channels = await telegram.getChannels();
  wsMessage({ type: "channels", channels });

  // Send account info
  const account = await metaapi.getAccountInfo();
  if (account) {
    wsMessage({ type: "account_info", account });
  }

  // Send positions
  const positions = await metaapi.getPositions();
  wsMessage({ type: "positions", positions });

  // Send markets
  const markets = await metaapi.getMarkets();
  wsMessage({ type: "markets", markets });

  // Send history
  const history = await metaapi.getHistory();
  wsMessage({ type: "history", trades: history });

  // Send existing signals
  signals.forEach((signal) => {
    wsMessage({ type: "signal_detected", signal });
  });
}

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

  // Set up Telegram message handler
  telegram.onMessage(async (message) => {
    broadcast({ type: "new_message", message });
    processMessage(message);
  });

  // Set up Telegram status handler
  telegram.onStatusChange((status) => {
    broadcast({ type: "telegram_status", status });
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
