/**
 * GROQ AI SIGNAL DETECTION (server/groq-ai.ts)
 * 
 * This module uses Groq's high-speed inference engine to analyze Telegram 
 * messages for trading signals. It implements a fallback system to ensure 
 * analysis happens even if some models are rate-limited.
 * 
 * DATA FLOW:
 * 1. Input: Raw TelegramMessage text.
 * 2. Processing: Multi-model fallback chain (Llama 3.3 -> 3.1 -> Mixtral).
 * 3. Output: ParsedSignal objects containing symbol, direction, and price levels.
 */

import Groq from "groq-sdk";
import type { ParsedSignal, TelegramMessage } from "@shared/schema";
import { randomUUID } from "crypto";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

// Models to try in order (fallback system) - faster models first
const MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "gpt-4o",
  "gpt-4o-mini",
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "mixtral-8x7b-32768",
  "llama3-70b-8192",
  "llama3-8b-8192",
];

const SIGNAL_DETECTION_PROMPT = `You are a forex trading signal detector. Analyze the message and determine if it contains a valid trading signal.

A valid trading signal must include:
- Strictly currency pair must be clear no hallucinations no price guessing to determine pair(e.g., EURUSD, GBPJPY, XAUUSD, etc.). Note: "GOLD" or "XAU" must be mapped to "XAUUSD".
- A direction (BUY/SELL or LONG/SHORT)
- Optionally: entry price, stop loss, take profit levels

Respond in JSON format only with an array of signals (one or more):
{
  "signals": [
    {
      "isSignal": boolean,
      "confidence": number (0-1),
      "reason": string (COMPREHENSIVE 40-80 word explanation. Break down the technical rationale, why the direction was chosen based on the message content, and provide a clear 'Risk Assessment' or 'Execution Tip' based on the specific parameters found. This is for the end-user to see clearly.),
      "symbol": string or null,
      "direction": "BUY" or "SELL" or null,
      "orderType": "MARKET" or "LIMIT",
      "entryPrice": number or null,
      "stopLoss": number or null,
      "takeProfit": [number] or null
    }
  ]
}

Rules for orderType:
- Use "LIMIT" ONLY if a specific entry price/level is explicitly mentioned (e.g., "Buy Limit at 1.0850", "Sell at 1.0850", "Entry: 1.0850").
- Use "MARKET" if the message says "Buy Now", "Sell Now", "Buy [SYMBOL] now", or if no specific entry price is provided.
- If it's just "Buy [SYMBOL]" or "Sell [SYMBOL]" without an "at [PRICE]" or "Limit" keyword, default to "MARKET".
- A single message might contain multiple signals (e.g. "Buy EURUSD now and Sell GBPUSD limit"). In such cases, provide multiple objects in the "signals" array.

For "reason", explain concisely:
- If valid: explain why
- If not valid: why it's not a signal 

Only respond with the JSON, no additional text.`;

interface SignalAnalysis {
  isSignal: boolean;
  confidence: number;
  reason: string;
  symbol: string | null;
  direction: "BUY" | "SELL" | null;
  orderType: "MARKET" | "LIMIT";
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number[] | null;
}

interface MultiSignalAnalysis {
  signals: SignalAnalysis[];
}

// Helper to add timeout to promises - 5 second timeout for fast fallback
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
  ]);
}

// Shorter timeout for faster model cycling
const MODEL_TIMEOUT_MS = 5000;

async function tryAnalyzeWithModel(
  model: string,
  messageText: string
): Promise<MultiSignalAnalysis | null> {
  try {
    // 5 second timeout per model for faster fallback
    const response = await withTimeout(
      groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SIGNAL_DETECTION_PROMPT },
          { role: "user", content: messageText },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
      MODEL_TIMEOUT_MS
    );

    if (!response) {
      console.log(`Model ${model} timed out after ${MODEL_TIMEOUT_MS/1000}s, trying next...`);
      return null;
    }

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as MultiSignalAnalysis;
    return parsed;
  } catch (error: any) {
    // Check if it's a rate limit or model unavailable error
    if (
      error?.status === 429 ||
      error?.status === 503 ||
      error?.message?.includes("rate limit") ||
      error?.message?.includes("overloaded")
    ) {
      console.log(`Model ${model} rate limited or unavailable, trying next...`);
      return null;
    }
    console.error(`Error with model ${model}:`, error?.message || error);
    return null;
  }
}

export async function analyzeMessage(message: TelegramMessage): Promise<{
  verdict: TelegramMessage["aiVerdict"];
  verdictDescription: string;
  signals: ParsedSignal[];
  modelUsed?: string;
}> {
  if (!message.text || message.text.trim().length < 3) {
    return { verdict: "no_signal", verdictDescription: "Message too short to contain trading signal", signals: [], modelUsed: undefined };
  }

  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY not set");
    return { verdict: "error", verdictDescription: "AI analysis unavailable", signals: [], modelUsed: undefined };
  }

  let analysis: MultiSignalAnalysis | null = null;
  let modelUsed: string | undefined = undefined;

  try {
    for (const model of MODELS) {
      analysis = await tryAnalyzeWithModel(model, message.text);
      if (analysis !== null && Array.isArray(analysis.signals)) {
        modelUsed = model.split('/').pop() || model;
        console.log(JSON.stringify({
          level: "INFO",
          module: "AI",
          event: "RAW_ANALYSIS",
          model: modelUsed,
          input: message.text,
          output: analysis
        }));
        console.log(`Successfully analyzed with model: ${modelUsed}`);
        break;
      }
    }

    if (!analysis || !Array.isArray(analysis.signals)) {
      console.error("All models failed to analyze message or returned invalid format");
      return { verdict: "error", verdictDescription: "AI analysis failed after trying all models", signals: [], modelUsed: undefined };
    }

    const validSignals = analysis.signals.filter(s => s.isSignal && s.symbol && s.direction);

    if (validSignals.length === 0) {
      const firstReason = analysis.signals[0]?.reason || "No actionable trading signal detected";
      return { verdict: "no_signal", verdictDescription: firstReason, signals: [], modelUsed };
    }

    const parsedSignals: ParsedSignal[] = validSignals.map((s, index) => {
      const normalizedSymbol = s.symbol!
        .replace(/[\/\s-]/g, "")
        .toUpperCase();

      return {
        id: `${message.channelId}:${message.id}:${index}`,
        messageId: message.id,
        channelId: message.channelId,
        symbol: normalizedSymbol,
        direction: s.direction!,
        orderType: s.orderType === "LIMIT" ? "LIMIT" : "MARKET",
        entryPrice: s.entryPrice || undefined,
        stopLoss: s.stopLoss || undefined,
        takeProfit: s.takeProfit || undefined,
        confidence: s.confidence,
        timestamp: new Date().toISOString(),
        status: "pending",
        rawMessage: message.text,
        modelUsed,
        verdictDescription: s.reason || `${s.direction} signal detected for ${s.symbol}`,
      };
    });

    const summary = parsedSignals.map(s => `${s.direction} ${s.symbol}`).join(", ");
    return { 
      verdict: "valid_signal", 
      verdictDescription: `${parsedSignals.length} signal(s) detected: ${summary}`, 
      signals: parsedSignals, 
      modelUsed 
    };
  } catch (error: any) {
    console.error("Message analysis failed:", error?.message || error);
    return { verdict: "error", verdictDescription: "Analysis error occurred", signals: [], modelUsed: undefined };
  }
}

export async function analyzeError(errorText: string): Promise<{
  explanation: string;
  correction: string;
  modelUsed?: string;
}> {
  if (!GROQ_API_KEY) {
    return { explanation: "AI analysis unavailable", correction: "Check GROQ_API_KEY configuration." };
  }

  const ERROR_PROMPT = `You are a specialized system administrator and trading bot developer. 
Analyze the following error log from a forex trading bot and provide:
1. A clear explanation of what went wrong.
2. A step-by-step correction or fix for the issue.

Respond in JSON format:
{
  "explanation": "string",
  "correction": "string"
}`;

  try {
    let result: any = null;
    let modelUsed: string | undefined = undefined;

    for (const model of MODELS) {
      const response = await withTimeout(
        groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: ERROR_PROMPT },
            { role: "user", content: errorText },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
        MODEL_TIMEOUT_MS
      );

      if (response) {
        const content = response.choices[0]?.message?.content;
        if (content) {
          result = JSON.parse(content);
          modelUsed = model.split('/').pop() || model;
          break;
        }
      }
    }

    if (!result) throw new Error("All models failed");

    return {
      explanation: result.explanation,
      correction: result.correction,
      modelUsed
    };
  } catch (error: any) {
    return {
      explanation: "Failed to analyze error log.",
      correction: "Please check logs manually or ensure API access is active.",
      modelUsed: undefined
    };
  }
}
