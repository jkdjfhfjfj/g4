import MetaApiPkg from "metaapi.cloud-sdk/node";
const MetaApi = MetaApiPkg.default;
import type {
  TradingAccount,
  Position,
  MarketSymbol,
  TradeHistory,
} from "@shared/schema";

const token = process.env.METAAPI_TOKEN || "";
const accountId = process.env.METAAPI_ACCOUNT_ID || "";

let api: MetaApi | null = null;
let account: any = null;
let connection: any = null;
let isConnected = false;

type StatusCallback = (status: "connected" | "disconnected" | "connecting") => void;
type PositionsCallback = (positions: Position[]) => void;

let statusCallbacks: StatusCallback[] = [];
let positionsCallbacks: PositionsCallback[] = [];

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
    if (account.state !== "DEPLOYED") {
      console.log("Deploying MetaAPI account...");
      await account.deploy();
      await account.waitDeployed();
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
    return null;
  }

  try {
    const info = await connection.getAccountInformation();
    return {
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
  } catch (error) {
    console.error("Failed to get account info:", error);
    return null;
  }
}

export async function getPositions(): Promise<Position[]> {
  if (!connection || !isConnected) {
    return [];
  }

  try {
    const positions = await connection.getPositions();
    return positions.map((p: any) => ({
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
  } catch (error) {
    console.error("Failed to get positions:", error);
    return [];
  }
}

export async function getMarkets(): Promise<MarketSymbol[]> {
  if (!connection || !isConnected) {
    return [];
  }

  try {
    // Get common forex pairs
    const symbols = [
      "EURUSD",
      "GBPUSD",
      "USDJPY",
      "USDCHF",
      "AUDUSD",
      "USDCAD",
      "NZDUSD",
      "EURGBP",
      "EURJPY",
      "GBPJPY",
      "XAUUSD",
      "XAGUSD",
    ];

    const markets: MarketSymbol[] = [];

    for (const symbol of symbols) {
      try {
        const price = await connection.getSymbolPrice(symbol);
        if (price) {
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
        // Symbol might not be available
      }
    }

    return markets;
  } catch (error) {
    console.error("Failed to get markets:", error);
    return [];
  }
}

export async function getHistory(): Promise<TradeHistory[]> {
  if (!connection || !isConnected) {
    return [];
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const deals = await connection.getDealsByTimeRange(thirtyDaysAgo, now);

    // Group deals by position to get complete trades
    const trades: TradeHistory[] = [];

    for (const deal of (deals || []).slice(-50)) {
      if (deal.type === "DEAL_TYPE_SELL" || deal.type === "DEAL_TYPE_BUY") {
        trades.push({
          id: deal.id,
          symbol: deal.symbol,
          type: deal.type === "DEAL_TYPE_BUY" ? "buy" : "sell",
          volume: deal.volume || 0,
          openPrice: deal.price || 0,
          closePrice: deal.price || 0,
          profit: deal.profit || 0,
          openTime: deal.time || new Date().toISOString(),
          closeTime: deal.time || new Date().toISOString(),
          commission: deal.commission || 0,
          swap: deal.swap || 0,
        });
      }
    }

    return trades.reverse();
  } catch (error) {
    console.error("Failed to get history:", error);
    return [];
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
