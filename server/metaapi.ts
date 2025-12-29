import MetaApiPkg from "metaapi.cloud-sdk/node";
const MetaApi = (MetaApiPkg as any).default || MetaApiPkg;
import type {
  TradingAccount,
  Position,
  MarketSymbol,
  TradeHistory,
} from "@shared/schema";

const token = process.env.METAAPI_TOKEN || "";
const accountId = process.env.METAAPI_ACCOUNT_ID || "";

// Extended RPC connection type with methods available at runtime but not in SDK types
interface ExtendedRpcConnection {
  connect(): Promise<void>;
  waitSynchronized(): Promise<void>;
  getSymbols(): Promise<string[]>;
  getSymbolSpecification(symbol: string): Promise<{ symbol: string; description?: string; digits?: number } | null>;
  getSymbolPrice(symbol: string): Promise<{ bid?: number; ask?: number } | null>;
  getAccountInformation(): Promise<any>;
  getPositions(): Promise<any[]>;
  getDealsByTimeRange(startTime: Date, endTime: Date): Promise<any[]>;
  createMarketBuyOrder(symbol: string, volume: number, stopLoss?: number, takeProfit?: number, options?: any): Promise<any>;
  createMarketSellOrder(symbol: string, volume: number, stopLoss?: number, takeProfit?: number, options?: any): Promise<any>;
  closePosition(positionId: string): Promise<void>;
}

// Account type with methods we use
interface MetaApiAccount {
  state: string;
  deploy: () => Promise<void>;
  waitDeployed: () => Promise<void>;
  getRPCConnection: () => ExtendedRpcConnection;
  getHistoryDealsByTimeRange: (startTime: string, endTime: string) => Promise<any[]>;
}

let api: any = null;
let account: MetaApiAccount | null = null;
let connection: ExtendedRpcConnection | null = null;
let isConnected = false;

type StatusCallback = (status: "connected" | "disconnected" | "connecting") => void;
type PositionsCallback = (positions: Position[]) => void;

let statusCallbacks: StatusCallback[] = [];
let positionsCallbacks: PositionsCallback[] = [];

// Cache to reduce API calls and avoid rate limiting
let cachedAccount: TradingAccount | null = null;
let cachedPositions: Position[] = [];
let cachedMarkets: MarketSymbol[] = [];
let cachedHistory: TradeHistory[] = [];
let lastAccountUpdate = 0;
let lastPositionsUpdate = 0;
let lastMarketsUpdate = 0;
let lastHistoryUpdate = 0;
const CACHE_TTL = 30000; // 30 seconds to avoid rate limiting

export function onStatusChange(callback: StatusCallback) {
  statusCallbacks.push(callback);
  return () => {
    statusCallbacks = statusCallbacks.filter((cb) => cb !== callback);
  };
}

export function onPositionsUpdate(callback: PositionsCallback) {
  positionsCallbacks.push(callback);
  return () => {
    positionsCallbacks = positionsCallbacks.filter((cb) => cb !== callback);
  };
}

function notifyStatus(status: "connected" | "disconnected" | "connecting") {
  statusCallbacks.forEach((cb) => cb(status));
}

function notifyPositions(positions: Position[]) {
  positionsCallbacks.forEach((cb) => cb(positions));
}

export async function initMetaApi(): Promise<void> {
  if (!token || !accountId) {
    console.error("MetaAPI credentials not set");
    notifyStatus("disconnected");
    return;
  }

  try {
    notifyStatus("connecting");

    api = new MetaApi(token);
    account = await api.metatraderAccountApi.getAccount(accountId);

    // Wait for account to be deployed
    if (account && account.state !== "DEPLOYED") {
      console.log("Deploying MetaAPI account...");
      await account.deploy();
      await account.waitDeployed();
    }

    if (!account) {
      throw new Error("Failed to get account");
    }

    // Use RPC connection for simpler API calls
    connection = account.getRPCConnection();
    await connection.connect();
    await connection.waitSynchronized();

    isConnected = true;
    notifyStatus("connected");
    console.log("MetaAPI connected successfully");

    // Set up position updates
    setInterval(async () => {
      if (isConnected) {
        const positions = await getPositions();
        notifyPositions(positions);
      }
    }, 5000);
  } catch (error) {
    console.error("Failed to connect to MetaAPI:", error);
    isConnected = false;
    notifyStatus("disconnected");
  }
}

export async function getAccountInfo(): Promise<TradingAccount | null> {
  if (!connection || !isConnected) {
    return cachedAccount;
  }

  const now = Date.now();
  if (cachedAccount && now - lastAccountUpdate < CACHE_TTL) {
    return cachedAccount;
  }

  try {
    const info = await connection.getAccountInformation();
    cachedAccount = {
      id: accountId,
      name: info.name || "Trading Account",
      login: info.login?.toString() || "",
      server: info.server || "",
      balance: info.balance || 0,
      equity: info.equity || 0,
      margin: info.margin || 0,
      freeMargin: info.freeMargin || 0,
      currency: info.currency || "USD",
      leverage: info.leverage || 100,
      connected: isConnected,
    };
    lastAccountUpdate = now;
    return cachedAccount;
  } catch (error) {
    console.error("Failed to get account info:", error);
    return cachedAccount;
  }
}

export async function getPositions(): Promise<Position[]> {
  if (!connection || !isConnected) {
    return cachedPositions;
  }

  const now = Date.now();
  if (cachedPositions.length > 0 && now - lastPositionsUpdate < CACHE_TTL) {
    return cachedPositions;
  }

  try {
    const positions = await connection.getPositions();
    cachedPositions = positions.map((p: any) => ({
      id: p.id,
      symbol: p.symbol,
      type: p.type === "POSITION_TYPE_BUY" ? "buy" : "sell",
      volume: p.volume,
      openPrice: p.openPrice,
      currentPrice: p.currentPrice || p.openPrice,
      stopLoss: p.stopLoss,
      takeProfit: p.takeProfit,
      profit: p.profit || 0,
      swap: p.swap || 0,
      openTime: p.time || new Date().toISOString(),
    }));
    lastPositionsUpdate = now;
    return cachedPositions;
  } catch (error) {
    console.error("Failed to get positions:", error);
    return cachedPositions;
  }
}

export async function getMarkets(): Promise<MarketSymbol[]> {
  if (!connection || !isConnected) {
    return cachedMarkets;
  }

  const now = Date.now();
  if (cachedMarkets.length > 0 && now - lastMarketsUpdate < CACHE_TTL) {
    return cachedMarkets;
  }

  try {
    // Get symbols dynamically from MetaAPI
    let availableSymbols: string[] = [];
    
    try {
      const symbols = await connection.getSymbols();
      if (symbols && symbols.length > 0) {
        // Filter for forex pairs and metals (common tradable instruments)
        availableSymbols = symbols
          .filter((s: any) => {
            const name = typeof s === 'string' ? s : s.symbol;
            return name && (
              name.match(/^[A-Z]{6}$/) || // Forex pairs like EURUSD
              name.startsWith("XAU") ||    // Gold
              name.startsWith("XAG")       // Silver
            );
          })
          .map((s: any) => typeof s === 'string' ? s : s.symbol)
          .slice(0, 40); // Limit to 40 symbols
      }
    } catch (e) {
      console.log("getSymbols not available, using fallback list");
    }

    // Fallback to common pairs if dynamic fetch fails
    if (availableSymbols.length === 0) {
      availableSymbols = [
        // Major pairs
        "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
        // Crosses
        "EURGBP", "EURJPY", "GBPJPY", "EURAUD", "EURCHF", "GBPAUD", "GBPCHF",
        "AUDJPY", "CADJPY", "CHFJPY", "NZDJPY", "AUDCAD", "AUDNZD", "CADCHF",
        // Metals
        "XAUUSD", "XAGUSD",
        // Indices (common broker symbols)
        "US30", "US500", "NAS100", "GER40", "UK100", "JP225",
        // Oil
        "USOIL", "UKOIL"
      ];
    }

    const markets: MarketSymbol[] = [];

    for (const symbol of availableSymbols) {
      try {
        const price = await connection.getSymbolPrice(symbol);
        if (price && (price.bid || price.ask)) {
          const specification = await connection.getSymbolSpecification(symbol);
          markets.push({
            symbol,
            bid: price.bid || 0,
            ask: price.ask || 0,
            spread: (price.ask || 0) - (price.bid || 0),
            digits: specification?.digits || 5,
          });
        }
      } catch (e) {
        // Symbol might not be available on this broker
      }
    }

    cachedMarkets = markets;
    lastMarketsUpdate = now;
    return cachedMarkets;
  } catch (error) {
    console.error("Failed to get markets:", error);
    return cachedMarkets;
  }
}

export async function getHistory(): Promise<TradeHistory[]> {
  if (!connection || !isConnected || !account) {
    return cachedHistory;
  }

  const now = Date.now();
  if (cachedHistory.length > 0 && now - lastHistoryUpdate < CACHE_TTL * 3) {
    return cachedHistory;
  }

  try {
    const nowDate = new Date();
    const thirtyDaysAgo = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Try multiple methods to get history
    let deals: any[] = [];
    
    // Method 1: Try RPC connection getDealsByTimeRange
    try {
      const rpcDeals = await connection.getDealsByTimeRange(thirtyDaysAgo, nowDate);
      if (rpcDeals && rpcDeals.length > 0) {
        deals = rpcDeals;
        console.log(`Got ${deals.length} deals from RPC connection`);
      }
    } catch (e) {
      console.log("RPC getDealsByTimeRange failed, trying REST API");
    }

    // Method 2: Try account REST API if RPC fails
    if (deals.length === 0) {
      try {
        const restDeals = await account.getHistoryDealsByTimeRange(
          thirtyDaysAgo.toISOString(),
          nowDate.toISOString()
        );
        if (restDeals && restDeals.length > 0) {
          deals = restDeals;
          console.log(`Got ${deals.length} deals from REST API`);
        }
      } catch (e) {
        console.log("REST getHistoryDealsByTimeRange failed");
      }
    }

    const trades: TradeHistory[] = [];

    for (const deal of (deals || []).slice(-50)) {
      // Filter for actual trade entries/exits
      const dealType = deal.type || deal.entryType;
      if (dealType === "DEAL_TYPE_SELL" || dealType === "DEAL_TYPE_BUY" ||
          dealType === "DEAL_ENTRY_IN" || dealType === "DEAL_ENTRY_OUT") {
        const isBuy = dealType === "DEAL_TYPE_BUY" || 
          (dealType === "DEAL_ENTRY_IN" && deal.positionType === "POSITION_TYPE_BUY");
        
        trades.push({
          id: deal.id || deal._id || String(Date.now()),
          symbol: deal.symbol || "Unknown",
          type: isBuy ? "buy" : "sell",
          volume: deal.volume || deal.lots || 0,
          openPrice: deal.price || deal.openPrice || 0,
          closePrice: deal.closePrice || deal.price || 0,
          profit: deal.profit || 0,
          openTime: deal.time || deal.openTime || new Date().toISOString(),
          closeTime: deal.closeTime || deal.time || new Date().toISOString(),
          commission: deal.commission || 0,
          swap: deal.swap || 0,
        });
      }
    }

    cachedHistory = trades.reverse();
    lastHistoryUpdate = now;
    console.log(`Returning ${cachedHistory.length} history trades`);
    return cachedHistory;
  } catch (error) {
    console.error("Failed to get history:", error);
    return cachedHistory;
  }
}

export async function executeTrade(
  symbol: string,
  direction: "BUY" | "SELL",
  volume: number,
  stopLoss?: number,
  takeProfit?: number
): Promise<{ success: boolean; message: string; positionId?: string }> {
  if (!connection || !isConnected) {
    return { success: false, message: "Not connected to MetaAPI" };
  }

  try {
    let result;

    if (direction === "BUY") {
      result = await connection.createMarketBuyOrder(
        symbol,
        volume,
        stopLoss,
        takeProfit,
        { comment: "TradingBot Signal" }
      );
    } else {
      result = await connection.createMarketSellOrder(
        symbol,
        volume,
        stopLoss,
        takeProfit,
        { comment: "TradingBot Signal" }
      );
    }

    console.log("Trade executed:", result);
    return {
      success: true,
      message: `${direction} order executed for ${symbol}`,
      positionId: result?.positionId,
    };
  } catch (error: any) {
    console.error("Failed to execute trade:", error);
    return {
      success: false,
      message: error?.message || "Failed to execute trade",
    };
  }
}

export async function closePosition(
  positionId: string
): Promise<{ success: boolean; message: string }> {
  if (!connection || !isConnected) {
    return { success: false, message: "Not connected to MetaAPI" };
  }

  try {
    await connection.closePosition(positionId);
    return { success: true, message: "Position closed successfully" };
  } catch (error: any) {
    console.error("Failed to close position:", error);
    return {
      success: false,
      message: error?.message || "Failed to close position",
    };
  }
}

export function getMetaApiStatus(): "connected" | "disconnected" | "connecting" {
  if (!api) return "disconnected";
  if (isConnected) return "connected";
  return "connecting";
}
