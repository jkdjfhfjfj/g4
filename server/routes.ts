import type { Express } from "express";
import type { Server } from "http";
import { initWebSocket } from "./websocket";
import * as telegram from "./telegram";
import * as metaapi from "./metaapi";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize WebSocket server
  initWebSocket(httpServer);

  // Initialize Telegram client
  telegram.initTelegram().catch((err) => {
    console.error("Failed to initialize Telegram:", err);
  });

  // Initialize MetaAPI
  metaapi.initMetaApi().catch((err) => {
    console.error("Failed to initialize MetaAPI:", err);
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      telegram: telegram.getTelegramStatus(),
      metaapi: metaapi.getMetaApiStatus(),
    });
  });

  // Get channels
  app.get("/api/channels", async (_req, res) => {
    try {
      const channels = await telegram.getChannels();
      res.json(channels);
    } catch (error) {
      console.error("Failed to get channels:", error);
      res.status(500).json({ error: "Failed to get channels" });
    }
  });

  // Get account info
  app.get("/api/account", async (_req, res) => {
    try {
      const account = await metaapi.getAccountInfo();
      if (account) {
        res.json(account);
      } else {
        res.status(503).json({ error: "Account not connected" });
      }
    } catch (error) {
      console.error("Failed to get account:", error);
      res.status(500).json({ error: "Failed to get account info" });
    }
  });

  // Get positions
  app.get("/api/positions", async (_req, res) => {
    try {
      const positions = await metaapi.getPositions();
      res.json(positions);
    } catch (error) {
      console.error("Failed to get positions:", error);
      res.status(500).json({ error: "Failed to get positions" });
    }
  });

  // Get markets
  app.get("/api/markets", async (_req, res) => {
    try {
      const markets = await metaapi.getMarkets();
      res.json(markets);
    } catch (error) {
      console.error("Failed to get markets:", error);
      res.status(500).json({ error: "Failed to get markets" });
    }
  });

  // Get history
  app.get("/api/history", async (_req, res) => {
    try {
      const history = await metaapi.getHistory();
      res.json(history);
    } catch (error) {
      console.error("Failed to get history:", error);
      res.status(500).json({ error: "Failed to get history" });
    }
  });

  return httpServer;
}
