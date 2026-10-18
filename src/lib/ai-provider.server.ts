import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ResolvedAiModel = {
  model: LanguageModel;
  providerName: string;
  isLovableGateway?: boolean;
};

export type ResolveAiOptions = {
  apiKey?: string | null | undefined;
  provider?: string | null | undefined;
  modelName?: string | null | undefined;
};

export async function getAiModel(options?: ResolveAiOptions): Promise<ResolvedAiModel> {
  const reqApiKey = options?.apiKey?.trim() || null;
  const reqProvider = options?.provider?.trim().toLowerCase() || null;

  // Check client-provided or environment keys
  const geminiKey =
    reqProvider === "gemini" && reqApiKey
      ? reqApiKey
      : (!reqProvider || reqProvider === "auto") && reqApiKey?.startsWith("AIzaSy")
        ? reqApiKey
        : process.env["GEMINI_API_KEY"] ||
          process.env["GOOGLE_GENERATIVE_AI_API_KEY"] ||
          process.env["GOOGLE_API_KEY"] ||
          null;

  const openaiKey =
    reqProvider === "openai" && reqApiKey
      ? reqApiKey
      : (!reqProvider || reqProvider === "auto") && reqApiKey?.startsWith("sk-") && !reqApiKey.startsWith("sk-or-")
        ? reqApiKey
        : process.env["OPENAI_API_KEY"] || null;

  const openrouterKey =
    reqProvider === "openrouter" && reqApiKey
      ? reqApiKey
      : (!reqProvider || reqProvider === "auto") && reqApiKey?.startsWith("sk-or-")
        ? reqApiKey
        : process.env["OPENROUTER_API_KEY"] || null;

  const groqKey =
    reqProvider === "groq" && reqApiKey
      ? reqApiKey
      : (!reqProvider || reqProvider === "auto") && reqApiKey?.startsWith("gsk_")
        ? reqApiKey
        : process.env["GROQ_API_KEY"] || null;

  const lovableKey = process.env["LOVABLE_API_KEY"] || null;

  // 1. Explicit or detected Google Gemini
  if ((reqProvider === "gemini" && reqApiKey) || (geminiKey && (!reqProvider || reqProvider === "auto" || reqProvider === "gemini"))) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey! });
    const selectedModel = options?.modelName || "gemini-2.0-flash";
    return {
      model: google(selectedModel),
      providerName: `Google Gemini (${selectedModel})`,
    };
  }

  // 2. Explicit or detected OpenAI
  if ((reqProvider === "openai" && reqApiKey) || (openaiKey && (!reqProvider || reqProvider === "auto" || reqProvider === "openai"))) {
    const openai = createOpenAI({ apiKey: openaiKey! });
    const selectedModel = options?.modelName || "gpt-4o";
    return {
      model: openai.chat(selectedModel),
      providerName: `OpenAI (${selectedModel})`,
    };
  }

  // 3. Explicit or detected OpenRouter
  if ((reqProvider === "openrouter" && reqApiKey) || (openrouterKey && (!reqProvider || reqProvider === "auto" || reqProvider === "openrouter"))) {
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openrouterKey!,
    });
    const selectedModel = options?.modelName || "google/gemini-2.0-flash-001";
    return {
      model: openrouter.chat(selectedModel),
      providerName: `OpenRouter (${selectedModel})`,
    };
  }

  // 4. Explicit or detected Groq
  if ((reqProvider === "groq" && reqApiKey) || (groqKey && (!reqProvider || reqProvider === "auto" || reqProvider === "groq"))) {
    const groq = createOpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: groqKey!,
    });
    const selectedModel = options?.modelName || "llama-3.3-70b-versatile";
    return {
      model: groq.chat(selectedModel),
      providerName: `Groq (${selectedModel})`,
    };
  }

  // 5. Lovable Gateway Fallback (if running inside Lovable sandbox)
  if (lovableKey) {
    const { createLovableAiGatewayRunIdFetch } = await import("./run-id.server");
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: lovableKey,
      headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });
    return {
      model: provider.responses("openai/gpt-6-astra"),
      providerName: "Lovable Gateway (gpt-6-astra)",
      isLovableGateway: true,
    };
  }

  throw new Error(
    "AI is not configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your environment variables (e.g. in Vercel project settings), or enter your API key directly in the AI Settings in the app.",
  );
}

export function formatAiError(error: unknown): string {
  if (!error) return "AI request failed. Please try again.";
  if (typeof error === "string") return error;

  const errObj = error as {
    message?: string;
    statusCode?: number;
    status?: number;
    data?: { error?: { message?: string } };
  };

  const status = errObj.statusCode ?? errObj.status;
  const apiMsg = errObj.data?.error?.message;

  if (status === 401) {
    return "Invalid AI API key. Please check your API key in environment variables or AI Settings.";
  }
  if (status === 429) {
    return "AI rate limit or quota exceeded. Please wait a moment or check your account quota.";
  }
  if (status === 402) {
    return "AI credits are exhausted for this account.";
  }
  if (status === 403) {
    return "AI access denied. Please check your API key permissions.";
  }

  if (apiMsg) return `AI Error: ${apiMsg}`;
  if (errObj.message) return errObj.message;

  return "AI extraction failed. Please try again.";
}
