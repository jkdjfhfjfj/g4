import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import type { TelegramChannel, TelegramMessage } from "@shared/schema";

const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
const apiHash = process.env.TELEGRAM_API_HASH || "";

let client: TelegramClient | null = null;
let stringSession = new StringSession("");
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
  // Re-emit current step so dialog can retry
  if (currentAuthStep) {
    setTimeout(() => notifyAuth(currentAuthStep!), 100);
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
  const apiIdVal = process.env.TELEGRAM_API_ID;
  const apiHashVal = process.env.TELEGRAM_API_HASH;
  
  if (!apiIdVal || !apiHashVal) {
    console.error("Telegram API credentials not set. Set TELEGRAM_API_ID and TELEGRAM_API_HASH");
    notifyStatus("disconnected");
    return;
  }

  try {
    const parsedApiId = parseInt(apiIdVal);
    console.log(`Initializing Telegram with API_ID: ${parsedApiId}, API_HASH: ${apiHashVal.substring(0, 8)}...`);

    client = new TelegramClient(stringSession, parsedApiId, apiHashVal, {
      connectionRetries: 5,
      retryDelay: 1000,
    });

    // Connect first (establishes connection without auth)
    await client.connect();
    console.log("Telegram network connected, checking auth...");

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
        onError: (err) => {
          console.error("Telegram auth error:", err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          
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
  
  client.addEventHandler(async (update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateNewChannelMessage) {
      const message = update.message;
      if (message instanceof Api.Message && selectedChannelId) {
        const channelId = message.peerId?.toString() || "";
        if (channelId.includes(selectedChannelId.replace("-100", ""))) {
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
      if (dialog.isChannel || dialog.isGroup) {
        const entity = dialog.entity;
        let participantsCount: number | undefined;
        let isPrivate = true;
        let username: string | undefined;

        if (entity instanceof Api.Channel) {
          participantsCount = entity.participantsCount;
          isPrivate = !entity.username;
          username = entity.username;
        }

        channels.push({
          id: dialog.id?.toString() || "",
          title: dialog.title || "Unknown",
          username,
          participantsCount,
          isPrivate,
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
