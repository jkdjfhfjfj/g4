/**
 * Telegram Integration Module
 * 
 * This module manages the connection to Telegram via GramJS (telegram package).
 * It handles authentication (phone, code, 2FA), session persistence, 
 * channel discovery, and real-time message monitoring.
 * 
 * Links:
 * - websocket.ts: Uses this module to relay Telegram messages and status to the frontend.
 * - routes.ts: Provides HTTP endpoints for channel listing.
 */

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import type { TelegramChannel, TelegramMessage } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

// Telegram API credentials (hardcoded for simplicity)
const apiId = 34108253;
const apiHash = "dacfc4bfece509097693f6d96d3420b8";

// Session persistence file path
const SESSION_FILE = path.join(process.cwd(), ".telegram_session");

/**
 * Loads the saved session string from disk if it exists.
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
 * Saves the session string to disk for persistence across restarts.
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
let selectedChannelId: string | null = null;
let currentStatus: "connected" | "disconnected" | "connecting" | "needs_auth" = "disconnected";

// Callbacks for notifying other modules (like websocket.ts) about events
type MessageCallback = (message: TelegramMessage) => void;
type StatusCallback = (status: "connected" | "disconnected" | "connecting" | "needs_auth") => void;
type AuthCallback = (type: "phone" | "code" | "password") => void;
type AuthErrorCallback = (message: string) => void;

let messageCallbacks: MessageCallback[] = [];
let statusCallbacks: StatusCallback[] = [];
let authCallbacks: AuthCallback[] = [];
let authErrorCallbacks: AuthErrorCallback[] = [];
let phoneResolver: ((phone: string) => void) | null = null;
let codeResolver: ((code: string) => void) | null = null;
let passwordResolver: ((password: string) => void) | null = null;
let currentAuthStep: "phone" | "code" | "password" | null = null;

// Subscription methods for events
export function onMessage(callback: MessageCallback) {
  messageCallbacks.push(callback);
  return () => {
    messageCallbacks = messageCallbacks.filter((cb) => cb !== callback);
  };
}

export function onStatusChange(callback: StatusCallback) {
  statusCallbacks.push(callback);
  return () => {
    statusCallbacks = statusCallbacks.filter((cb) => cb !== callback);
  };
}

export function onAuthRequired(callback: AuthCallback) {
  authCallbacks.push(callback);
  return () => {
    authCallbacks = authCallbacks.filter((cb) => cb !== callback);
  };
}

export function onAuthError(callback: AuthErrorCallback) {
  authErrorCallbacks.push(callback);
  return () => {
    authErrorCallbacks = authErrorCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Notifies all status subscribers about a status change.
 */
function notifyStatus(status: "connected" | "disconnected" | "connecting" | "needs_auth") {
  currentStatus = status;
  statusCallbacks.forEach((cb) => cb(status));
}

/**
 * Notifies all message subscribers when a new message arrives from a selected channel.
 */
function notifyMessage(message: TelegramMessage) {
  messageCallbacks.forEach((cb) => cb(message));
}

/**
 * Notifies all auth subscribers when a specific auth step is required.
 */
function notifyAuth(type: "phone" | "code" | "password") {
  currentAuthStep = type;
  authCallbacks.forEach((cb) => cb(type));
}

/**
 * Handles auth errors and re-triggers the current auth step for retry.
 */
function notifyAuthError(message: string) {
  authErrorCallbacks.forEach((cb) => cb(message));
  if (currentStatus === "disconnected") return;
  
  if (currentAuthStep) {
    console.log(`Auth error reported, re-emitting step: ${currentAuthStep}`);
    setTimeout(() => notifyAuth(currentAuthStep!), 500);
  }
}

// Submitters for the auth flow, resolving promises created in initTelegram
export function submitPhone(phone: string) {
  if (phoneResolver) {
    console.log("Resolving phone number...");
    phoneResolver(phone);
    phoneResolver = null;
  } else {
    console.warn("Phone submitted but no resolver active");
  }
}

export function submitCode(code: string) {
  if (codeResolver) {
    console.log("Resolving auth code...");
    codeResolver(code);
    codeResolver = null;
  } else {
    console.warn("Code submitted but no resolver active");
  }
}

export function submitPassword(password: string) {
  if (passwordResolver) {
    console.log("Resolving 2FA password...");
    passwordResolver(password);
    passwordResolver = null;
  } else {
    console.warn("Password submitted but no resolver active");
  }
}

/**
 * Initializes the Telegram client, handles connection, and starts the auth flow if needed.
 */
export async function initTelegram(): Promise<void> {
  try {
    console.log(`Initializing Telegram with API_ID: ${apiId}, API_HASH: ${apiHash.substring(0, 8)}...`);

    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      retryDelay: 1000,
    });

    // Establish network connection
    try {
      await client.connect();
      console.log("Telegram network connected, checking auth...");
    } catch (connectError: any) {
      const errorMsg = connectError?.message || String(connectError);
      console.error("Connection error:", errorMsg);
      
      // Handle corrupted session keys
      if (errorMsg.includes("AUTH_KEY_DUPLICATED") || errorMsg.includes("Session error")) {
        console.log("Corrupted session detected, clearing and retrying...");
        
        try {
          if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE);
          }
        } catch (e) {}
        
        stringSession = new StringSession("");
        client = new TelegramClient(stringSession, apiId, apiHash, {
          connectionRetries: 5,
          retryDelay: 1000,
        });
        
        await client.connect();
        console.log("Telegram network connected with fresh session");
        notifyAuthError("Previous session was invalid. Please log in again.");
      } else {
        notifyAuthError(`Connection failed: ${errorMsg}`);
        throw connectError;
      }
    }

    // Check authorization status
    const isAuthorized = await client.isUserAuthorized();
    
    if (isAuthorized) {
      isConnected = true;
      notifyStatus("connected");
      console.log("Telegram already authorized");
      setupMessageHandler();
    } else {
      console.log("Telegram requires authentication");
      notifyStatus("needs_auth");
      notifyAuth("phone");
      
      // GramJS client.start() handles the auth loop via interactive callbacks
      client.start({
        phoneNumber: async () => {
          return new Promise<string>((resolve) => {
            phoneResolver = resolve;
          });
        },
        password: async () => {
          notifyAuth("password");
          return new Promise<string>((resolve) => {
            passwordResolver = resolve;
          });
        },
        phoneCode: async () => {
          notifyAuth("code");
          return new Promise<string>((resolve) => {
            codeResolver = resolve;
          });
        },
        onError: (err: any) => {
          console.error("Telegram auth error callback:", err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          
          if (err?.seconds) {
            const waitSeconds = err.seconds;
            notifyAuthError(`Too many login attempts. Please wait ${waitSeconds} seconds.`);
            return;
          }
          
          notifyAuthError(errorMessage);
        },
      }).then(() => {
        isConnected = true;
        currentAuthStep = null;
        notifyStatus("connected");
        console.log("Telegram authenticated successfully");
        if (client) {
          const sessionString = client.session.save() as unknown as string;
          saveSession(sessionString);
        }
        setupMessageHandler();
      }).catch((err) => {
        console.error("Telegram auth failed:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        notifyAuthError(errorMessage);
        currentAuthStep = "phone";
        notifyStatus("needs_auth");
        notifyAuth("phone");
      });
    }
  } catch (error: any) {
    console.error("Failed to connect to Telegram:", error?.message || error);
    isConnected = false;
    notifyStatus("disconnected");
  }
}

/**
 * Sets up the event handler for incoming channel messages.
 */
function setupMessageHandler() {
  if (!client) return;
  
  console.log("Setting up real-time message handler...");
  
  client.addEventHandler(async (update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateNewChannelMessage) {
      const message = update.message;
      if (message instanceof Api.Message && selectedChannelId) {
        const peerId = message.peerId as any;
        let channelId = "";
        
        if (peerId.channelId) {
          channelId = `-100${peerId.channelId}`;
        } else if (peerId.chatId) {
          channelId = `-${peerId.chatId}`;
        } else if (peerId.userId) {
          channelId = `${peerId.userId}`;
        }
        
        const incomingNum = channelId.replace("-100", "").replace("-", "");
        const isSelected = selectedChannelId && (
          Array.isArray(selectedChannelId) 
            ? selectedChannelId.some(id => {
                const targetNum = id.replace("-100", "").replace("-", "");
                return targetNum === incomingNum;
              })
            : selectedChannelId.toString().replace("-100", "").replace("-", "") === incomingNum
        );
        
        if (isSelected) {
          const telegramMessage: TelegramMessage = {
            id: message.id,
            channelId: channelId,
            channelTitle: "",
            text: message.message || "",
            date: new Date(message.date * 1000).toISOString(),
            senderName: undefined,
            aiVerdict: "analyzing",
          };
          notifyMessage(telegramMessage);
        }
      }
    }
  });
}

/**
 * Fetches a list of dialogs (channels/groups) for the user.
 */
export async function getChannels(): Promise<TelegramChannel[]> {
  if (!client || !isConnected) {
    return [];
  }

  try {
    const dialogs = await client.getDialogs({ limit: 100 });
    const channels: TelegramChannel[] = [];

    for (const dialog of dialogs) {
      if (dialog.isChannel || dialog.isGroup) {
        const entity = dialog.entity;
        let participantsCount: number | undefined;
        let isPrivate = true;
        let username: string | undefined;

        if (entity instanceof Api.Channel) {
          participantsCount = entity.participantsCount;
          isPrivate = !entity.username;
          username = entity.username;
        } else if (entity instanceof Api.Chat) {
          participantsCount = entity.participantsCount;
          isPrivate = true;
        }

        channels.push({
          id: dialog.id?.toString() || "",
          title: dialog.title || "Unknown",
          username,
          participantsCount,
          isPrivate,
          type: (dialog.isChannel ? "channel" : "group") as any,
        });
      }
    }

    return channels;
  } catch (error) {
    console.error("Failed to get channels:", error);
    return [];
  }
}

/**
 * Selects a channel to monitor and fetches recent historical messages.
 */
export async function selectChannel(channelId: string): Promise<TelegramMessage[]> {
  if (!client || !isConnected) {
    return [];
  }

  selectedChannelId = channelId;

  try {
    const entity = await client.getEntity(channelId);
    const messages = await client.getMessages(entity, { limit: 100 });

    return messages
      .filter((msg) => msg.message)
      .map((msg) => ({
        id: msg.id,
        channelId,
        channelTitle: (entity as any).title || "",
        text: msg.message || "",
        date: new Date(msg.date * 1000).toISOString(),
        senderName: undefined,
        aiVerdict: "analyzing" as const,
      }));
  } catch (error) {
    console.error("Failed to select channel:", error);
    return [];
  }
}

export function getTelegramStatus(): "connected" | "disconnected" | "connecting" | "needs_auth" {
  return currentStatus;
}

export function getSelectedChannelId(): string | null {
  return selectedChannelId;
}

/**
 * Attempts to reconnect the Telegram client.
 */
export async function reconnect(): Promise<void> {
  if (client) {
    try {
      notifyStatus("connecting");
      
      const authPromise = client.isUserAuthorized();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Authorization check timed out")), 10000)
      );
      
      const isAuthorized = await Promise.race([authPromise, timeoutPromise]) as boolean;
      
      if (isAuthorized) {
        isConnected = true;
        notifyStatus("connected");
        console.log("Telegram reconnected using valid session");
        setupMessageHandler();
      } else {
        console.log("Session invalid, starting fresh auth...");
        notifyStatus("needs_auth");
        notifyAuth("phone");
        await initTelegram();
      }
    } catch (e: any) {
      console.error("Error during Telegram reconnect:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      notifyAuthError(`Reconnection failed: ${errorMessage}`);
      notifyStatus("disconnected");
    }
  } else {
    await initTelegram();
  }
}

/**
 * Disconnects the Telegram client manually.
 */
export async function disconnect(): Promise<void> {
  if (client) {
    try {
      await client.disconnect();
      console.log("Telegram disconnected manually");
    } catch (e) {
      console.error("Error disconnecting Telegram:", e);
    }
    isConnected = false;
    currentStatus = "disconnected";
    notifyStatus("disconnected");
  }
}
