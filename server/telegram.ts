import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import type { TelegramChannel, TelegramMessage } from "@shared/schema";

const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
const apiHash = process.env.TELEGRAM_API_HASH || "";

let client: TelegramClient | null = null;
let stringSession = new StringSession("");
let isConnected = false;
let selectedChannelId: string | null = null;

type MessageCallback = (message: TelegramMessage) => void;
type StatusCallback = (status: "connected" | "disconnected" | "connecting" | "needs_auth") => void;
type AuthCallback = (type: "phone" | "code" | "password") => void;

let messageCallbacks: MessageCallback[] = [];
let statusCallbacks: StatusCallback[] = [];
let authCallbacks: AuthCallback[] = [];
let phoneResolver: ((phone: string) => void) | null = null;
let codeResolver: ((code: string) => void) | null = null;
let passwordResolver: ((password: string) => void) | null = null;

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

function notifyStatus(status: "connected" | "disconnected" | "connecting" | "needs_auth") {
  statusCallbacks.forEach((cb) => cb(status));
}

function notifyMessage(message: TelegramMessage) {
  messageCallbacks.forEach((cb) => cb(message));
}

function notifyAuth(type: "phone" | "code" | "password") {
  authCallbacks.forEach((cb) => cb(type));
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
  if (!apiId || !apiHash) {
    console.error("Telegram API credentials not set");
    notifyStatus("disconnected");
    return;
  }

  try {
    notifyStatus("connecting");

    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () => {
        notifyStatus("needs_auth");
        notifyAuth("phone");
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
      },
    });

    isConnected = true;
    notifyStatus("connected");

    // Save session for later
    const sessionString = client.session.save() as unknown as string;
    console.log("Telegram session saved (length):", sessionString?.length || 0);

    // Add message handler
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

    console.log("Telegram client connected successfully");
  } catch (error) {
    console.error("Failed to connect to Telegram:", error);
    isConnected = false;
    notifyStatus("disconnected");
  }
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
  if (!client) return "disconnected";
  if (isConnected) return "connected";
  return "connecting";
}

export function getSelectedChannelId(): string | null {
  return selectedChannelId;
}
