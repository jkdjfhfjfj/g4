/**
 * TELEGRAM INTEGRATION (server/telegram.ts)
 * 
 * This module manages the connection to Telegram via GramJS.
 * It handles session persistence, real-time message listening, 
 * and the multi-step authentication flow (phone -> code -> 2FA).
 * 
 * ERROR: AUTH_KEY_DUPLICATED
 * This error occurs when the session being used is currently active on another 
 * instance or has been invalidated by Telegram (e.g., logged out from another device).
 * We fix this by detecting the error, deleting the local session file, and 
 * forcing the user to log in again to generate a fresh, unique session.
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import type { TelegramChannel, TelegramMessage } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

// Telegram API credentials (hardcoded for this environment)
const apiId = 34108253;
const apiHash = "dacfc4bfece509097693f6d96d3420b8";

// Path to the persistent session file
const SESSION_FILE = path.join(process.cwd(), ".telegram_session");

/**
 * Loads the saved session string from disk.
 * This allows the bot to stay logged in after restarts.
 */
function loadSession(): string {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const saved = fs.readFileSync(SESSION_FILE, "utf-8").trim();
      if (saved) {
        console.log("Loaded existing Telegram session");
        return saved;
      }
    }
  } catch (e) {
    console.log("No saved session found");
  }
  return "";
}

/**
 * Saves the active session string to disk.
 */
function saveSession(session: string) {
  try {
    fs.writeFileSync(SESSION_FILE, session, "utf-8");
    console.log("Telegram session saved");
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}

let client: TelegramClient | null = null;
let stringSession = new StringSession(loadSession());
let isConnected = false;
let selectedChannelIds: string[] = [];
let currentStatus: "connected" | "disconnected" | "connecting" | "needs_auth" = "disconnected";

type MessageCallback = (message: TelegramMessage) => void;
type StatusCallback = (status: "connected" | "disconnected" | "connecting" | "needs_auth") => void;
type AuthCallback = (type: "phone" | "code" | "password") => void;
type AuthErrorCallback = (message: string) => void;

let messageCallbacks: MessageCallback[] = [];
let statusCallbacks: StatusCallback[] = [];
let authCallbacks: AuthCallback[] = [];
let authErrorCallbacks: AuthErrorCallback[] = [];

// Resolvers for the async client.start() flow
let phoneResolver: ((phone: string) => void) | null = null;
let codeResolver: ((code: string) => void) | null = null;
let passwordResolver: ((password: string) => void) | null = null;
let currentAuthStep: "phone" | "code" | "password" | null = null;

export function onMessage(callback: MessageCallback) {
  messageCallbacks.push(callback);
  return () => { messageCallbacks = messageCallbacks.filter((cb) => cb !== callback); };
}

export function onStatusChange(callback: StatusCallback) {
  statusCallbacks.push(callback);
  return () => { statusCallbacks = statusCallbacks.filter((cb) => cb !== callback); };
}

export function onAuthRequired(callback: AuthCallback) {
  authCallbacks.push(callback);
  return () => { authCallbacks = authCallbacks.filter((cb) => cb !== callback); };
}

export function onAuthError(callback: AuthErrorCallback) {
  authErrorCallbacks.push(callback);
  return () => { authErrorCallbacks = authErrorCallbacks.filter((cb) => cb !== callback); };
}

function notifyStatus(status: "connected" | "disconnected" | "connecting" | "needs_auth") {
  currentStatus = status;
  statusCallbacks.forEach((cb) => cb(status));
}

function notifyMessage(message: TelegramMessage) {
  messageCallbacks.forEach((cb) => cb(message));
}

function notifyAuth(type: "phone" | "code" | "password") {
  currentAuthStep = type;
  authCallbacks.forEach((cb) => cb(type));
}

function notifyAuthError(message: string) {
  authErrorCallbacks.forEach((cb) => cb(message));
  if (currentStatus === "disconnected") return;
  
  // Re-emit step to allow retry
  if (currentAuthStep) {
    console.log(`Auth error reported, re-emitting step: ${currentAuthStep}`);
    setTimeout(() => notifyAuth(currentAuthStep!), 500);
  }
}

/**
 * Handles AUTH_KEY_DUPLICATED errors globally.
 * This common Telegram error means the session is invalid or used elsewhere.
 * We must clear the session and force a re-login.
 */
async function handleDuplicatedAuth() {
  console.error("CRITICAL: AUTH_KEY_DUPLICATED detected. Clearing session.");
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
  } catch (e) {}
  
  stringSession = new StringSession("");
  isConnected = false;
  notifyStatus("needs_auth");
  notifyAuthError("Your Telegram session was invalidated. Please log in again.");
  
  // Re-initialize client if possible
  if (client) {
    try { await client.disconnect(); } catch (e) {}
    client = null;
  }
}

export function submitPhone(phone: string) {
  if (phoneResolver) { phoneResolver(phone); phoneResolver = null; }
}

export function submitCode(code: string) {
  if (codeResolver) { codeResolver(code); codeResolver = null; }
}

export function submitPassword(password: string) {
  if (passwordResolver) { passwordResolver(password); passwordResolver = null; }
}

/**
 * Initializes the Telegram client.
 * Establishes connection and handles existing vs new session logic.
 */
export async function initTelegram(): Promise<void> {
  try {
    console.log(`Initializing Telegram client...`);

    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      retryDelay: 1000,
    });

    try {
      await client.connect();
      console.log("Telegram network connected.");
    } catch (connectError: any) {
      const errorMsg = connectError?.message || String(connectError);
      if (errorMsg.includes("AUTH_KEY_DUPLICATED")) {
        await handleDuplicatedAuth();
        return; // Stop initialization, user needs to re-auth
      }
      throw connectError;
    }

    const isAuthorized = await client.isUserAuthorized();
    
    if (isAuthorized) {
      isConnected = true;
      notifyStatus("connected");
      console.log("Telegram session valid.");
      setupMessageHandler();
    } else {
      console.log("Authentication required.");
      notifyStatus("needs_auth");
      notifyAuth("phone");
      
      // GramJS start() flow: it calls these functions when it needs data
      client.start({
        phoneNumber: async () => new Promise((resolve) => { phoneResolver = resolve; }),
        password: async () => { notifyAuth("password"); return new Promise((resolve) => { passwordResolver = resolve; }); },
        phoneCode: async () => { notifyAuth("code"); return new Promise((resolve) => { codeResolver = resolve; }); },
        onError: async (err: any) => {
          const msg = err?.message || String(err);
          if (msg.includes("AUTH_KEY_DUPLICATED")) {
            await handleDuplicatedAuth();
            return true; // Return boolean as expected by GramJS
          } else {
            notifyAuthError(msg);
            return false;
          }
        },
      }).then(() => {
        isConnected = true;
        currentAuthStep = null;
        notifyStatus("connected");
        if (client) saveSession(client.session.save() as unknown as string);
        setupMessageHandler();
      }).catch(async (err) => {
        if (String(err).includes("AUTH_KEY_DUPLICATED")) {
          await handleDuplicatedAuth();
        } else {
          notifyAuthError(err?.message || String(err));
          notifyStatus("needs_auth");
          notifyAuth("phone");
        }
      });
    }
  } catch (error: any) {
    console.error("Failed to connect to Telegram:", error);
    if (String(error).includes("AUTH_KEY_DUPLICATED")) {
      await handleDuplicatedAuth();
    } else {
      isConnected = false;
      notifyStatus("disconnected");
    }
  }
}

function normalizeId(id: string | number | undefined | null): string {
  if (!id) return "";
  // String conversion and basic cleanup
  let sid = id.toString().trim();
  // Remove common prefixes
  sid = sid.replace(/^-100/, "").replace(/^-/, "");
  return sid;
}

/**
 * Sets up the real-time event listener for new messages.
 */
function setupMessageHandler() {
  if (!client) return;
  
  client.addEventHandler(async (update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateNewChannelMessage) {
      const message = update.message;
      if (message instanceof Api.Message) {
        const peerId = message.peerId as any;
        let channelId = "";
        
        if (peerId.channelId) channelId = `-100${peerId.channelId}`;
        else if (peerId.chatId) channelId = `-${peerId.chatId}`;
        else if (peerId.userId) channelId = `${peerId.userId}`;
        
        const incomingNum = normalizeId(channelId);
        
        // Ensure selectedChannelIds is properly checked
        // Log for debugging
        console.log(`[TG] Incoming from ${channelId} (${incomingNum}). Active IDs: ${selectedChannelIds.join(",")}`);

        const isSelected = selectedChannelIds.some(id => normalizeId(id) === incomingNum);

        if (isSelected) {
          console.log(`[TG] MATCH: Real-time message ${message.id} from channel ${channelId}`);
          const telegramMessage: TelegramMessage = {
            id: message.id,
            channelId: channelId,
            channelTitle: "",
            text: message.message || "",
            date: new Date(message.date * 1000).toISOString(),
            aiVerdict: "analyzing",
          };
          notifyMessage(telegramMessage);
        } else {
          // Log ignored signals to help user find the correct channel ID
          const lowerText = (message.message || "").toLowerCase();
          if (lowerText.includes("buy") || lowerText.includes("sell") || lowerText.includes("gold") || lowerText.includes("forex")) {
            console.log(`[TG] IGNORED SIGNAL from ${channelId} (${incomingNum}). Selection mismatch.`);
          }
        }
      }
    }
  });
}

export async function getChannels(): Promise<TelegramChannel[]> {
  if (!client || !isConnected) return [];
  try {
    const dialogs = await client.getDialogs({ limit: 100 });
    return dialogs
      .filter(d => d.isChannel || d.isGroup)
      .map(d => ({
        id: d.id?.toString() || "",
        title: d.title || "Unknown",
        isPrivate: true,
        type: (d.isChannel ? "channel" : "group") as any,
      }));
  } catch (error) {
    console.error("Failed to get channels:", error);
    return [];
  }
}

export async function selectChannel(channelId: string | string[]): Promise<TelegramMessage[]> {
  if (!client || !isConnected) return [];
  
  if (Array.isArray(channelId)) {
    selectedChannelIds = channelId;
  } else {
    selectedChannelIds = [channelId];
  }

  // Filter out empty IDs and handle invalid IDs
  const validIds = selectedChannelIds.filter(id => id && id.trim().length > 0);
  if (validIds.length === 0) return [];

  const lastChannelId = validIds[validIds.length - 1];
  
  try {
    const entity = await client.getEntity(lastChannelId);
    const messages = await client.getMessages(entity, { limit: 100 });
    return messages.filter(m => m.message).map(m => ({
      id: m.id,
      channelId: lastChannelId,
      channelTitle: (entity as any).title || "",
      text: m.message || "",
      date: new Date(m.date * 1000).toISOString(),
      aiVerdict: "analyzing" as const,
    }));
  } catch (error: any) {
    // Only log once and more cleanly
    const errorMsg = error.errorMessage || error.message || "Unknown error";
    if (errorMsg === "CHANNEL_INVALID") {
      console.log(`[TG] Channel ${lastChannelId} is invalid or inaccessible. Removing from active list.`);
    } else {
      console.error(`[TG] Failed to select channel ${lastChannelId}:`, errorMsg);
    }
    
    // Remove the invalid channel ID from the list to prevent future errors
    selectedChannelIds = selectedChannelIds.filter(id => id !== lastChannelId);
    return [];
  }
}

export function getTelegramStatus() { return currentStatus; }
export function getSelectedChannelIds() { return selectedChannelIds; }

export async function reconnect(): Promise<void> {
  if (client) {
    try {
      notifyStatus("connecting");
      const isAuthorized = await client.isUserAuthorized();
      if (isAuthorized) {
        isConnected = true;
        notifyStatus("connected");
        setupMessageHandler();
      } else {
        await initTelegram();
      }
    } catch (e: any) {
      if (String(e).includes("AUTH_KEY_DUPLICATED")) {
        await handleDuplicatedAuth();
      } else {
        notifyStatus("disconnected");
      }
    }
  } else {
    await initTelegram();
  }
}

export async function disconnect(): Promise<void> {
  if (client) {
    try { await client.disconnect(); } catch (e) {}
    isConnected = false;
    currentStatus = "disconnected";
    notifyStatus("disconnected");
  }
}
