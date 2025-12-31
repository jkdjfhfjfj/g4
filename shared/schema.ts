import { pgTable, text, varchar, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Telegram Channel
export interface TelegramChannel {
  id: string;
  title: string;
  username?: string;
  participantsCount?: number;
  isPrivate: boolean;
  type?: 'channel' | 'group';
}

// Telegram Message
export interface TelegramMessage {
  id: number;
  channelId: string;
  channelTitle: string;
  text: string;
  date: string;
  senderName?: string;
  aiVerdict?: 'valid_signal' | 'no_signal' | 'analyzing' | 'error' | 'skipped';
  verdictDescription?: string;
  parsedSignal?: ParsedSignal | null;
  isRealtime?: boolean;
  modelUsed?: string;
}

// Parsed Trading Signal
export interface ParsedSignal {
  id: string;
  messageId: number;
  channelId: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number[];
  confidence: number;
  timestamp: string;
  status: 'pending' | 'executed' | 'dismissed' | 'failed';
  rawMessage: string;
  verdictDescription?: string;
  modelUsed?: string;
  failureReason?: string;
}

// MetaAPI Account Info
export interface TradingAccount {
  id: string;
  name: string;
  login: string;
  server: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  currency: string;
  leverage: number;
  connected: boolean;
}

// Trading Position
export interface Position {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number;
  swap: number;
  openTime: string;
}

// Market Symbol
export interface MarketSymbol {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  digits: number;
}

// Trade History
export interface TradeHistory {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  openTime: string;
  closeTime: string;
  commission: number;
  swap: number;
}

// WebSocket Message Types
export type WSMessageType = 
  | { type: 'connection_status'; status: 'connected' | 'disconnected' | 'connecting' }
  | { type: 'telegram_status'; status: 'connected' | 'disconnected' | 'connecting' | 'needs_auth' }
  | { type: 'metaapi_status'; status: 'connected' | 'disconnected' | 'connecting' }
  | { type: 'channels'; channels: TelegramChannel[] }
  | { type: 'new_message'; message: TelegramMessage }
  | { type: 'signal_detected'; signal: ParsedSignal }
  | { type: 'signal_updated'; signal: ParsedSignal }
  | { type: 'auto_trade_executed'; signal: ParsedSignal; result: { success: boolean; message: string } }
  | { type: 'account_info'; account: TradingAccount }
  | { type: 'positions'; positions: Position[] }
  | { type: 'position_update'; position: Position }
  | { type: 'position_closed'; positionId: string }
  | { type: 'markets'; markets: MarketSymbol[] }
  | { type: 'history'; trades: TradeHistory[] }
  | { type: 'error'; message: string }
  | { type: 'auth_required'; phone?: string }
  | { type: 'auth_step'; step: 'phone' | 'code' | 'password' | 'done'; message?: string }
  | { type: 'auth_error'; message: string }
  | { type: 'saved_channel'; channelId: string | null }
  | { type: 'auto_trade_enabled'; enabled: boolean }
  | { type: 'trade_result'; success: boolean; message: string }
  | { type: 'lot_size_updated'; lotSize: number }
  | { type: 'telegram_disconnected' };

// Insert schemas for API validation
export const executeTradeSchema = z.object({
  signalId: z.string().optional(),
  symbol: z.string(),
  direction: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  volume: z.number().min(0.01).max(100),
  entryPrice: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
});

export type ExecuteTradeInput = z.infer<typeof executeTradeSchema>;

export const closePositionSchema = z.object({
  positionId: z.string(),
});

export type ClosePositionInput = z.infer<typeof closePositionSchema>;

export const selectChannelSchema = z.object({
  channelId: z.string(),
});

export type SelectChannelInput = z.infer<typeof selectChannelSchema>;
