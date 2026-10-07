import { createServerFn } from "@tanstack/react-start";

export type AiDraftQuestion = {
  subject: string;
  qtype: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

export const formatQuestionsWithAI = createServerFn({ method: "POST" })
  .inputValidator((input: { rawText: string; defaultSubject?: string }) => {
    if (!input || typeof input.rawText !== "string" || input.rawText.trim().length < 10) {
      throw new Error("Paste your question text first");
    }
    return { rawText: input.rawText.slice(0, 20000), defaultSubject: input.defaultSubject ?? "" };
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];
    if (!lovableKey && !openaiKey) throw new Error("AI is not configured");

    const { streamText } = await import("ai");
    let model: Parameters<typeof streamText>[0]["model"];
    let providerOptions: Parameters<typeof streamText>[0]["providerOptions"];
    if (lovableKey) {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const { createLovableAiGatewayRunIdFetch } = await import("./run-id.server");
      const runIdFetch = createLovableAiGatewayRunIdFetch();
      const provider = createOpenAI({
        baseURL: "https://ai.gateway.lovable.dev/v1",
        apiKey: lovableKey,
        headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        fetch: runIdFetch.fetch,
      });
      model = provider.responses("openai/gpt-6-astra");
      providerOptions = {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      };
    } else {
      // Self-hosted fallback (e.g. Vercel): use the deployment's own OpenAI key.
      const { createOpenAI } = await import("@ai-sdk/openai");
      model = createOpenAI({ apiKey: openaiKey! })("gpt-4o");
      providerOptions = undefined;
    }

    const system = [
      "You are an expert GATE CS problem formatter.",
      "Convert the raw question text into strict JSON.",
      'Return ONLY a JSON array, each item: {"subject","qtype","difficulty","question","options","correct_index","explanation"}.',
      "subject must be one of: DBMS, Prog. and DS, Algorithms, Operating System, Computer Networks, TOC, Compiler Design, COA, Digital Logic, Discrete Maths, Engg. Maths, Aptitude.",
      "qtype is MCQ, MSQ or NAT. difficulty is Easy, Medium or Hard.",
      "options is an array of plain-text options (empty array for NAT). correct_index is 0-based.",
      "Write a short, clear explanation. Plain text only, no markdown, no LaTeX delimiters.",
      data.defaultSubject ? `If the subject is unclear, use: ${data.defaultSubject}.` : "",
    ].join(" ");

    let text = "";
    try {
      const result = streamText({
        model,
        system,
        prompt: data.rawText,
        ...(providerOptions ? { providerOptions } : {}),
      });
      text = await result.text;
    } catch (error) {
      const status = (error as { statusCode?: number; status?: number }).statusCode ??
        (error as { status?: number }).status;
      if (status === 429) throw new Error("AI is rate limited right now — try again shortly.");
      if (status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error("AI could not format these questions. Try again.");
    }

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("AI returned an unexpected format. Try again.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("AI returned invalid JSON. Try again.");
    }
    if (!Array.isArray(parsed)) throw new Error("AI returned no questions.");

    const questions: AiDraftQuestion[] = parsed
      .map((raw) => {
        const r = raw as Record<string, unknown>;
        const options = Array.isArray(r["options"]) ? (r["options"] as unknown[]).map(String) : [];
        const idx = Number(r["correct_index"] ?? 0);
        return {
          subject: String(r["subject"] ?? data.defaultSubject ?? "DBMS"),
          qtype: String(r["qtype"] ?? (options.length ? "MCQ" : "NAT")),
          difficulty: String(r["difficulty"] ?? "Medium"),
          question: String(r["question"] ?? "").trim(),
          options,
          correct_index: Number.isFinite(idx)
            ? Math.max(0, Math.min(Math.max(options.length - 1, 0), idx))
            : 0,
          explanation: String(r["explanation"] ?? "").trim(),
        };
      })
      .filter((q) => q.question.length > 3);

    if (!questions.length) throw new Error("AI could not find any question in that text.");
    return { questions };
  });
