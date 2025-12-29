import Groq from "groq-sdk";
import type { ParsedSignal, TelegramMessage } from "@shared/schema";
import { randomUUID } from "crypto";

const groq = new Groq({
  apiKey: "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",
});

// Models to try in order (fallback system)
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "llama3-8b-8192",
];

const SIGNAL_DETECTION_PROMPT = `You are a forex trading signal detector. Analyze the message and determine if it contains a valid trading signal.

A valid trading signal must include:
- A currency pair (e.g., EURUSD, GBPJPY, XAUUSD, etc.)
- A direction (BUY/SELL or LONG/SHORT)
- Optionally: entry price, stop loss, take profit levels

Respond in JSON format only:
{
  "isSignal": boolean,
  "confidence": number (0-1),
  "reason": string (brief 10-20 word explanation of why this is or isn't a valid signal),
  "symbol": string or null,
  "direction": "BUY" or "SELL" or null,
  "entryPrice": number or null,
  "stopLoss": number or null,
  "takeProfit": [number] or null
}

For "reason", explain concisely:
- If valid: what signal was detected (e.g., "Clear BUY signal for EURUSD with entry at 1.0850 and SL/TP levels")
- If not valid: why it's not a signal (e.g., "General market commentary without actionable trade direction" or "Missing currency pair information")

Only respond with the JSON, no additional text.`;

interface SignalAnalysis {
  isSignal: boolean;
  confidence: number;
  reason: string;
  symbol: string | null;
  direction: "BUY" | "SELL" | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number[] | null;
}

async function tryAnalyzeWithModel(
  model: string,
  messageText: string
): Promise<SignalAnalysis | null> {
  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SIGNAL_DETECTION_PROMPT },
        { role: "user", content: messageText },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as SignalAnalysis;
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
  signal: ParsedSignal | null;
}> {
  if (!message.text || message.text.trim().length < 3) {
    return { verdict: "no_signal", verdictDescription: "Message too short to contain trading signal", signal: null };
  }

  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY not set");
    return { verdict: "error", verdictDescription: "AI analysis unavailable", signal: null };
  }

  let analysis: SignalAnalysis | null = null;

  try {
    for (const model of MODELS) {
      analysis = await tryAnalyzeWithModel(model, message.text);
      if (analysis !== null) {
        console.log(`Successfully analyzed with model: ${model}`);
        break;
      }
    }

    if (!analysis) {
      console.error("All models failed to analyze message");
      return { verdict: "error", verdictDescription: "AI analysis failed after trying all models", signal: null };
    }

    if (!analysis.isSignal || !analysis.symbol || !analysis.direction) {
      return { verdict: "no_signal", verdictDescription: analysis.reason || "No actionable trading signal detected", signal: null };
    }

    const normalizedSymbol = analysis.symbol
      .replace(/[\/\s-]/g, "")
      .toUpperCase();

    const signal: ParsedSignal = {
      id: randomUUID(),
      messageId: message.id,
      channelId: message.channelId,
      symbol: normalizedSymbol,
      direction: analysis.direction,
      entryPrice: analysis.entryPrice || undefined,
      stopLoss: analysis.stopLoss || undefined,
      takeProfit: analysis.takeProfit || undefined,
      confidence: analysis.confidence,
      timestamp: new Date().toISOString(),
      status: "pending",
      rawMessage: message.text,
    };

    return { verdict: "valid_signal", verdictDescription: analysis.reason || `${analysis.direction} signal detected for ${analysis.symbol}`, signal };
  } catch (error: any) {
    console.error("Message analysis failed:", error?.message || error);
    return { verdict: "error", verdictDescription: "Analysis error occurred", signal: null };
  }
}
