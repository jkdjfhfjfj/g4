import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import type { TelegramChannel, TelegramMessage } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

// Telegram API credentials (hardcoded)
const apiId = 34108253;
const apiHash = "dacfc4bfece509097693f6d96d3420b8";

// Session persistence
const SESSION_FILE = path.join(process.cwd(), ".telegram_session");

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
  // Always re-emit the current auth step so user can retry
  // This allows them to wait out flood timeouts and try again
  if (currentAuthStep) {
    setTimeout(() => notifyAuth(currentAuthStep!), 500);
  }
}

export function submitPhone(phone: string) {
  if (phoneResolver) {
    phoneResolver(phone);
    phoneResolver = null;
  }
}

export function submitCode(code: string) {
  if (codeResolver) {
    codeResolver(code);
    codeResolver = null;
  }
}

export function submitPassword(password: string) {
  if (passwordResolver) {
    passwordResolver(password);
    passwordResolver = null;
  }
}

export async function initTelegram(): Promise<void> {
  try {
    console.log(`Initializing Telegram with API_ID: ${apiId}, API_HASH: ${apiHash.substring(0, 8)}...`);

    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      retryDelay: 1000,
    });

    // Connect first (establishes connection without auth)
    try {
      await client.connect();
      console.log("Telegram network connected, checking auth...");
    } catch (connectError: any) {
      const errorMsg = connectError?.message || String(connectError);
      
      // Handle corrupted session (AUTH_KEY_DUPLICATED)
      if (errorMsg.includes("AUTH_KEY_DUPLICATED")) {
        console.log("Corrupted session detected, clearing and retrying...");
        
        // Clear corrupted session
        try {
          fs.unlinkSync(SESSION_FILE);
        } catch (e) {
          // File may not exist
        }
        
        // Reset to empty session
        stringSession = new StringSession("");
        client = new TelegramClient(stringSession, apiId, apiHash, {
          connectionRetries: 5,
          retryDelay: 1000,
        });
        
        // Try connecting again with fresh session
        await client.connect();
        console.log("Telegram network connected with fresh session, checking auth...");
      } else {
        throw connectError;
      }
    }

    // Check if already authorized
    const isAuthorized = await client.isUserAuthorized();
    
    if (isAuthorized) {
      isConnected = true;
      notifyStatus("connected");
      console.log("Telegram already authorized");
      setupMessageHandler();
    } else {
      // Need authentication
      console.log("Telegram requires authentication");
      notifyStatus("needs_auth");
      notifyAuth("phone");
      
      // Start auth flow in background
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
          console.error("Telegram auth error:", err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          
          // Check for flood wait errors and extract wait time
          if (err?.seconds) {
            const waitSeconds = err.seconds;
            const userMessage = `Too many login attempts. Please wait ${waitSeconds} seconds before trying again.`;
            notifyAuthError(userMessage);
            return;
          }
          
          // Helpful message for common errors
          if (errorMessage.includes("API_ID_INVALID")) {
            console.error("ERROR: API_ID_INVALID - Your TELEGRAM_API_ID or TELEGRAM_API_HASH is incorrect.");
            console.error("Fix: Go to https://my.telegram.org/apps and verify your API credentials match exactly.");
            console.error("Note: Make sure you're using a production app, not a test app.");
          }
          
          notifyAuthError(errorMessage);
        },
      }).then(() => {
        isConnected = true;
        currentAuthStep = null;
        notifyStatus("connected");
        console.log("Telegram authenticated successfully");
        // Save session for persistence
        if (client) {
          const sessionString = client.session.save() as unknown as string;
          saveSession(sessionString);
        }
        setupMessageHandler();
      }).catch((err) => {
        console.error("Telegram auth failed:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        notifyAuthError(errorMessage);
        // Keep needs_auth status so dialog stays open for retry
        // Reset to phone step for fresh attempt
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

function setupMessageHandler() {
  if (!client) return;
  
  console.log("Setting up real-time message handler...");
  
  client.addEventHandler(async (update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateNewChannelMessage) {
      const message = update.message;
      if (message instanceof Api.Message && selectedChannelId) {
        const peerId = message.peerId as any;
        let channelId = "";
        
        // Extract channel ID based on peer type
        if (peerId.channelId) {
          channelId = `-100${peerId.channelId}`;
        } else if (peerId.chatId) {
          channelId = `-${peerId.chatId}`;
        } else if (peerId.userId) {
          channelId = `${peerId.userId}`;
        }
        
        // Debug logging
        if (message.message) {
          console.log(`New message from channel: ${channelId}, text: "${message.message.substring(0, 50)}..."`);
          console.log(`Selected channel: ${selectedChannelId}`);
          
          // More flexible comparison
          const selectedNum = selectedChannelId.replace("-100", "").replace("-", "");
          const incomingNum = channelId.replace("-100", "").replace("-", "");
          
          if (incomingNum === selectedNum) {
            console.log("✓ Message matches selected channel, notifying...");
            const telegramMessage: TelegramMessage = {
              id: message.id,
              channelId: selectedChannelId,
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
    }
  });
}

export async function getChannels(): Promise<TelegramChannel[]> {
  if (!client || !isConnected) {
    return [];
  }

  try {
    const dialogs = await client.getDialogs({ limit: 100 });
    const channels: TelegramChannel[] = [];

    for (const dialog of dialogs) {
      if (dialog.isChannel || dialog.isGroup || dialog.isChat) {
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
          type: dialog.isChannel ? "channel" : "group",
        });
      }
    }

    return channels;
  } catch (error) {
    console.error("Failed to get channels:", error);
    return [];
  }
}

export async function selectChannel(channelId: string): Promise<TelegramMessage[]> {
  if (!client || !isConnected) {
    return [];
  }

  selectedChannelId = channelId;

  try {
    const entity = await client.getEntity(channelId);
    const messages = await client.getMessages(entity, { limit: 50 });

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
