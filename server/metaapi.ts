import MetaApiPkg from "metaapi.cloud-sdk/node";
const MetaApi = (MetaApiPkg as any).default || MetaApiPkg;
import type {
  TradingAccount,
  Position,
  MarketSymbol,
  TradeHistory,
} from "@shared/schema";

const token = "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OWU1ZDVhYTJjNzFiNmU0MjkwN2M2OWNhZTExM2Q3ZSIsImFjY2Vzc1J1bGVzIjpbeyJpZCI6InRyYWRpbmctYWNjb3VudC1tYW5hZ2VtZW50LWFwaSIsIm1ldGhvZHMiOlsidHJhZGluZy1hY2NvdW50LW1hbmFnZW1lbnQtYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiXSwicmVzb3VyY2VzIjpbImFjY291bnQ6JFVTRVJfSUQkOjY1Njk4MjI1LTExZjQtNDNiOC05NmNjLTIyZGI5NGQ4YTc1YyJdfSx7ImlkIjoibWV0YWFwaS1yZXN0LWFwaSIsIm1ldGhvZHMiOlsibWV0YWFwaS1hcGk6cmVzdDpwdWJsaWM6KjoqIl0sInJvbGVzIjpbInJlYWRlciIsIndyaXRlciJdLCJyZXNvdXJjZXMiOlsiYWNjb3VudDokVVNFUl9JRCQ6NjU2OTgyMjUtMTFmNC00M2I4LTk2Y2MtMjJkYjk0ZDhhNzVjIl19LHsiaWQiOiJtZXRhYXBpLXJwYy1hcGkiLCJtZXRob2RzIjpbIm1ldGFhcGktYXBpOndzOnB1YmxpYzoqOioiXSwicm9sZXMiOlsicmVhZGVyIiwid3JpdGVyIl0sInJlc291cmNlcyI6WyJhY2NvdW50OiRVU0VSX0lEJDo2NTY5ODIyNS0xMWY0LTQzYjgtOTZjYy0yMmRiOTRkOGE3NWMiXX0seyJpZCI6Im1ldGFhcGktcmVhbC10aW1lLXN0cmVhbWluZy1hcGkiLCJtZXRob2RzIjpbIm1ldGFhcGktYXBpOndzOnB1YmxpYzoqOioiXSwicm9sZXMiOlsicmVhZGVyIiwid3JpdGVyIl0sInJlc291cmNlcyI6WyJhY2NvdW50OiRVU0VSX0lEJDo2NTY5ODIyNS0xMWY0LTQzYjgtOTZjYy0yMmRiOTRkOGE3NWMiXX0seyJpZCI6Im1ldGFzdGF0cy1hcGkiLCJtZXRob2RzIjpbIm1ldGFzdGF0cy1hcGk6cmVzdDpwdWJsaWM6KjoqIl0sInJvbGVzIjpbInJlYWRlciJdLCJyZXNvdXJjZXMiOlsiYWNjb3VudDokVVNFUl9JRCQ6NjU2OTgyMjUtMTFmNC00M2I4LTk2Y2MtMjJkYjk0ZDhhNzVjIl19LHsiaWQiOiJyaXNrLW1hbmFnZW1lbnQtYXBpIiwibWV0aG9kcyI6WyJyaXNrLW1hbmFnZW1lbnQtYXBpOnJlc3Q6cHVibGljOio6KiJdLCJyb2xlcyI6WyJyZWFkZXIiXSwicmVzb3VyY2VzIjpbImFjY291bnQ6JFVTRVJfSUQkOjY1Njk4MjI1LTExZjQtNDNiOC05NmNjLTIyZGI5NGQ4YTc1YyJdfV0sImlnbm9yZVJhdGVMaW1pdHMiOmZhbHNlLCJ0b2tlbklkIjoiMjAyMTAyMTMiLCJpbXBlcnNvbmF0ZWQiOmZhbHNlLCJyZWFsVXNlcklkIjoiNjllNWQ1YWEyYzcxYjZlNDI5MDdjNjljYWUxMTNkN2UiLCJpYXQiOjE3NjcwMDQ3MTl9.CcUls-sbhSA2Qc_IvnJaUb9ajg_x-knG3rNe27ylKRv9xi0MOJcf_YH30-XySvFqaIPEkygdZyodi87E_TlAOsLEPS9Ew4xRy4BnD6Nc0J27us5mTbvx2kglXpBsdu9RUi_aTkHK8We7gtXhSHlW0uA1Ar2wx9unhcnDRmLN2id9RFGAQDvxG2aQ8VdX8T4NA49G5XcGYpUw_hgwmGolYh_S1gBZinRCdH-sWRqW6duwilQPwVLYez7G81EJj-IN7qsQ7vDOkVhlpdFCEjdo5Bw2QtStv1HhYXB4dq3-IHuM-rHu4N63BYGdrlD1SDCQGt-zQUPl3VWlx3KkxBfM1H6aiMFMtgYcyXP8YE1fiYFOYnxle_OEj6sOxgPeQDzy770eub2I5rgXSBpOp35eOg6Bdl6prAnl7cNqbFrZn3NjP0FUPWSBYZQgUyGuoxxwEWiJC3LX5ec1vf78ETtt9bXhDSK53clsHATtUuNwym39NgbdhVARjW0vLhtuLziUxaI1FaKVNAGVv79VoauN-cYWYdOExpsjnVG7vIZ4wn1Bp_APKRfAOSCdsyrCgfcpIuONUIFn4SFSR15gPIoyLAbCJan_0kIoumagijqoZrhcY3UCGe-h1CZ9sb0VLZp764xI0Kt6c7rMCywAbjNLryB_7VWrheisG6UJjV5SfJU";
const accountId = "65698225-11f4-43b8-96cc-22db94d8a75c";

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
let marketCallbacks: ((markets: MarketSymbol[]) => void)[] = [];

export function onMarketsUpdate(callback: (markets: MarketSymbol[]) => void) {
  marketCallbacks.push(callback);
  return () => {
    marketCallbacks = marketCallbacks.filter((cb) => cb !== callback);
  };
}

function notifyMarkets(markets: MarketSymbol[]) {
  marketCallbacks.forEach((cb) => cb(markets));
}

// Cache to reduce API calls and avoid rate limiting
let cachedAccount: TradingAccount | null = null;
let cachedPositions: Position[] = [];
let cachedMarkets: MarketSymbol[] = [];
let cachedHistory: TradeHistory[] = [];
let cachedSymbols: string[] = []; // Cache symbols fetched at startup
let lastAccountUpdate = 0;
let lastPositionsUpdate = 0;
let lastMarketsUpdate = 0;
let lastHistoryUpdate = 0;
const CACHE_TTL = 300000; // 5 minutes to stay within free tier rate limits

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

    // Fetch and cache symbol list once at startup
    try {
      console.log("Fetching symbol list at startup...");
      const symbols = await connection.getSymbols();
      if (symbols && symbols.length > 0) {
        cachedSymbols = symbols.filter((s: any) => {
          const name = typeof s === 'string' ? s : s.symbol;
          return name && (
            name.match(/^[A-Z]{6}$/) || 
            name.startsWith("XAU") || 
            name.startsWith("XAG")
          );
        }).map((s: any) => typeof s === 'string' ? s : s.symbol).slice(0, 40);
        console.log(`Cached ${cachedSymbols.length} symbols for trading`);
      }
    } catch (e) {
      console.log("Symbol caching not available, will use fallback list");
    }

    // Set up real-time updates with respect for rate limits (every 5 seconds)
    // Markets fetch every 5 seconds for live updates
    setInterval(async () => {
      if (isConnected) {
        try {
          const markets = await getMarkets();
          if (markets.length > 0) {
            notifyMarkets(markets);
          }
        } catch (e) {
          // Silently handle rate limits
        }
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
  // Return cached markets if available and fresh (cached for 5 seconds - frequent updates)
  if (cachedMarkets.length > 0 && now - lastMarketsUpdate < 5000) {
    return cachedMarkets;
  }

  try {
    // Use ALL cached symbols from startup, fallback to full list
    let availableSymbols = cachedSymbols.length > 0 ? cachedSymbols : [
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

    const markets: MarketSymbol[] = [];
    
    // Fetch ALL symbols to get complete market list
    const symbolsToFetch = availableSymbols.slice(0, Math.min(availableSymbols.length, 30));
    
    for (const symbol of symbolsToFetch) {
      if (markets.length >= 20) break; // Fetch at least 20 markets per call
      
      try {
        const price = await connection.getSymbolPrice(symbol);
        if (price && price.bid && price.ask) {
          // Try to get specification, but don't fail if not available
          let digits = 5;
          try {
            const specification = await connection.getSymbolSpecification(symbol);
            if (specification && specification.digits) {
              digits = specification.digits;
            }
          } catch (e) {
            // Use default digits if specification fails
          }
          
          markets.push({
            symbol,
            bid: price.bid,
            ask: price.ask,
            spread: price.ask - price.bid,
            digits,
          });
        }
      } catch (e) {
        // Symbol might not be available or API limit hit - continue to next
        continue;
      }
    }

    // Always update cache with whatever we got
    if (markets.length > 0) {
      cachedMarkets = markets;
      lastMarketsUpdate = now;
    }
    
    // Return fetched markets or cached if fetch failed
    return markets.length > 0 ? markets : cachedMarkets;
  } catch (error) {
    console.error("Failed to get markets:", error);
    return cachedMarkets;
  }
}

export async function getHistory(): Promise<TradeHistory[]> {
  if (!connection || !isConnected) {
    return cachedHistory;
  }

  const now = Date.now();
  // Cache for 30 seconds only - get fresh history
  if (cachedHistory.length > 0 && now - lastHistoryUpdate < 30000) {
    return cachedHistory;
  }

  try {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    // Use RPC connection getDealsByTimeRange
    let deals: any[] = [];
    
    try {
      const rpcDeals = await connection.getDealsByTimeRange(startTime, endTime);
      if (rpcDeals && rpcDeals.length > 0) {
        deals = rpcDeals;
        console.log(`Got ${deals.length} deals from RPC connection`);
      }
    } catch (e: any) {
      console.log("getDealsByTimeRange not available:", e.message?.substring(0, 50));
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
