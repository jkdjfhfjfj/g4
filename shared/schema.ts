/**
 * DATA MODELS & SCHEMAS (shared/schema.ts)
 * 
 * This file defines the core data structures used by both the frontend (React) 
 * and backend (Express). It serves as the single source of truth for the 
 * shape of data flowing through the application via WebSockets and REST APIs.
 */

import { pgTable, text, varchar, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

/**
 * DATABASE SCHEMA: Users
 * Defines the persistent storage structure for user accounts.
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

/**
 * ZOD SCHEMAS: Validation & Types
 * Used by the backend to validate incoming data and the frontend to define state types.
 */
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/**
 * TELEGRAM DATA MODELS
 * Representations of data retrieved from the Telegram client (GramJS).
 */

// A channel or group the user is a member of
export interface TelegramChannel {
  id: string; // Internal Telegram ID
  title: string; // Visible name
  username?: string; // @username if public
  participantsCount?: number;
  isPrivate: boolean;
  type?: 'channel' | 'group';
}

// A raw message received from a Telegram channel
export interface TelegramMessage {
  id: number; // Message ID within the channel
  channelId: string; // Source channel ID
  channelTitle: string; // Name of the source channel
  channelName?: string;
  text: string; // Raw text content
  date: string; // ISO timestamp
  senderName?: string;
  aiVerdict?: 'valid_signal' | 'no_signal' | 'analyzing' | 'error' | 'skipped'; // Status of AI analysis
  verdictDescription?: string; // AI's explanation for the verdict
  parsedSignal?: ParsedSignal | null; // The signal extracted from the text
  isRealtime?: boolean; // True if received live, false if from history
  modelUsed?: string; // The LLM model that performed analysis
}

/**
 * TRADING DATA MODELS
 * Representations of signals and MetaTrader execution data.
 */

// A signal parsed from a message by Groq AI
export interface ParsedSignal {
  id: string; // Unique ID (usually channelId:messageId)
  messageId: number;
  channelId: string;
  symbol: string; // e.g., "EURUSD"
  direction: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number[];
  confidence: number; // 0.0 to 1.0 score from AI
  timestamp: string;
  status: 'pending' | 'executed' | 'dismissed' | 'failed';
  rawMessage: string;
  verdictDescription?: string;
  modelUsed?: string;
  failureReason?: string; // Error message if execution fails
}

// Trading account state from MetaAPI
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

// An open trade in the MetaTrader account
export interface Position {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number; // Lot size
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number; // Floating P/L in account currency
  swap: number;
  openTime: string;
}

// Real-time market price data
export interface MarketSymbol {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  digits: number; // Decimal precision (e.g., 5 for pips)
}

// A closed trade from account history
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

/**
 * WEBSOCKET COMMUNICATION (WSMessageType)
 * 
 * This union type defines every possible message that can be sent 
 * from the backend to the frontend. This is the "backbone" of the 
 * real-time data flow.
 */
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

// Validation schemas for frontend-to-backend commands
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
