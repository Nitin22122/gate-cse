import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { getAiModel, formatAiError } from "./ai-provider.server";

export const SUBJECTS = [
  "DBMS",
  "Prog. and DS",
  "Algorithms",
  "Operating System",
  "Computer Networks",
  "TOC",
  "Compiler Design",
  "COA",
  "Digital Logic",
  "Discrete Maths",
  "Engg. Maths",
  "Aptitude",
] as const;

export type GateSubject = (typeof SUBJECTS)[number];

function normalizeSubject(val?: string | null): GateSubject {
  if (!val) return "DBMS";
  const s = val.trim().toLowerCase();
  if (s.includes("algo")) return "Algorithms";
  if (s.includes("data struct") || s.includes("prog") || s.includes("c lang") || s.includes("ds"))
    return "Prog. and DS";
  if (s.includes("dbms") || s.includes("database") || s.includes("sql")) return "DBMS";
  if (s.includes("network") || s.includes("cn")) return "Computer Networks";
  if (s.includes("operat") || s.includes("os")) return "Operating System";
  if (s.includes("toc") || s.includes("automata") || s.includes("computation") || s.includes("theory"))
    return "TOC";
  if (s.includes("compil") || s.includes("cd")) return "Compiler Design";
  if (s.includes("coa") || s.includes("architecture") || s.includes("organization")) return "COA";
  if (s.includes("digital") || s.includes("logic")) return "Digital Logic";
  if (s.includes("discrete") || s.includes("graph theory") || s.includes("set theory"))
    return "Discrete Maths";
  if (
    s.includes("engg") ||
    s.includes("engineering math") ||
    s.includes("calculus") ||
    s.includes("linear") ||
    s.includes("probability")
  )
    return "Engg. Maths";
  if (s.includes("apt") || s.includes("verbal") || s.includes("reasoning") || s.includes("general"))
    return "Aptitude";
  return "DBMS";
}

function normalizeQType(val?: string | null, optionsCount = 0): "MCQ" | "MSQ" | "NAT" {
  if (!val) return optionsCount > 0 ? "MCQ" : "NAT";
  const upper = val.trim().toUpperCase();
  if (upper === "MSQ") return "MSQ";
  if (upper === "NAT" || optionsCount === 0) return "NAT";
  return "MCQ";
}

const figureSchema = z
  .object({
    page: z.number().describe("1-based page number where the figure is located"),
    x0: z.number().describe("left edge, 0-1000 of page width"),
    y0: z.number().describe("top edge, 0-1000 of page height"),
    x1: z.number().describe("right edge, 0-1000 of page width"),
    y1: z.number().describe("bottom edge, 0-1000 of page height"),
  })
  .strict();

const questionSchema = z.object({
  question_number: z.number().optional().default(1),
  subject: z.string().describe("GATE subject: DBMS, Prog. and DS, Algorithms, Operating System, Computer Networks, TOC, Compiler Design, COA, Digital Logic, Discrete Maths, Engg. Maths, Aptitude"),
  topic: z.string().optional().default("General"),
  qtype: z.string().describe("MCQ, MSQ, or NAT"),
  marks: z.number().optional().default(1),
  question: z.string(),
  options: z.array(z.string()).optional().default([]),
  correct: z.array(z.number()).optional().default([]).describe("1-based option numbers (e.g. 1 for A, 2 for B); empty for NAT"),
  nat_answer: z.string().nullable().optional().describe("NAT numerical answer or range, e.g. '12.5' or '4.0 to 4.2'"),
  answer_source: z.string().optional().default("ai"),
  explanation: z.string().optional().default(""),
  figure: figureSchema.nullable().optional(),
});

const outputSchema = z.object({
  questions: z.array(questionSchema),
});

export type PdfDraftQuestion = {
  question_number: number;
  subject: GateSubject;
  topic: string;
  qtype: "MCQ" | "MSQ" | "NAT";
  marks: number;
  question: string;
  options: string[];
  correct: number[];
  nat_answer: string | null;
  answer_source: "key" | "ai";
  explanation: string;
  figure: {
    page: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null;
};

const inputSchema = z.object({
  pages: z
    .array(z.object({ page: z.number().int().min(1), image: z.string().min(20) }))
    .min(1)
    .max(5),
  year: z.number().int().min(1990).max(2100),
  paper: z.string().max(40),
  answerKey: z.string().max(50000).nullable().optional(),
  apiKey: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
});

export const extractPyqFromPages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { model, isLovableGateway } = await getAiModel({
      apiKey: data.apiKey,
      provider: data.provider,
    });

    const instructions = [
      `You are an expert exam question extractor for GATE ${data.paper} ${data.year}.`,
      "Carefully extract EVERY question visible on these pages, including General Aptitude. Skip cover pages, instruction pages, or page headers/footers.",
      "Copy question text and option choices faithfully without missing formulas or math. Write math symbols in readable plain text (e.g. x^2, log n, sqrt(n), <=, ->).",
      "Identify qtype: MCQ (single choice), MSQ (multiple select), or NAT (numerical answer, no options).",
      "marks: 1 or 2 based on section markers (Q.1-Q.5 and Q.11-Q.35 are usually 1 mark; others 2 marks).",
      "If an answer key is provided below, use it for exact answers (answer_source 'key'). Otherwise solve accurately step-by-step (answer_source 'ai').",
      "correct: array of 1-based option numbers (1 for option A, 2 for B, 3 for C, 4 for D). For NAT, correct must be [] and nat_answer must be provided.",
      "explanation: concise, clear solution explaining the answer.",
      "topic: concise GATE syllabus topic like 'Binary Trees', 'Virtual Memory', 'Relational Algebra', 'TCP/IP', etc.",
      "figure: if the question contains a diagram, circuit, table, tree, or graph that cannot be represented in plain text, give a tight bounding box (x0, y0, x1, y1 from 0 to 1000) and page number. Otherwise null.",
      "If a question is cut off at the bottom of the last page, still extract whatever is visible.",
    ].join("\n");

    const content: Array<
      { type: "text"; text: string } | { type: "file"; data: string; mediaType: string }
    > = [];

    for (const p of data.pages) {
      content.push({ type: "text", text: `[Scanned Page ${p.page}]` });
      const base64 = p.image.replace(/^data:[^;]+;base64,/, "");
      content.push({ type: "file", data: base64, mediaType: "image/jpeg" });
    }

    if (data.answerKey) {
      content.push({ type: "text", text: `Official answer key reference:\n${data.answerKey}` });
    }

    content.push({ type: "text", text: "Extract all questions from the provided pages now in strict JSON format." });

    const providerOptions = isLovableGateway
      ? {
          openai: {
            forceReasoning: true,
            reasoningEffort: "medium" as const,
            reasoningSummary: "auto" as const,
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        }
      : undefined;

    try {
      const result = await generateText({
        model,
        system: instructions,
        messages: [{ role: "user", content }],
        output: Output.object({ schema: outputSchema }),
        ...(providerOptions ? { providerOptions } : {}),
      });

      const rawQuestions = result.output.questions;
      const questions: PdfDraftQuestion[] = rawQuestions.map((q, idx) => {
        const opts = q.options ?? [];
        const isNat = q.qtype === "NAT" || opts.length === 0;
        return {
          question_number: q.question_number || idx + 1,
          subject: normalizeSubject(q.subject),
          topic: q.topic || "General",
          qtype: normalizeQType(q.qtype, opts.length),
          marks: q.marks === 2 ? 2 : 1,
          question: q.question.trim(),
          options: isNat ? [] : opts,
          correct: Array.isArray(q.correct) ? q.correct : [],
          nat_answer: isNat ? (q.nat_answer ?? null) : null,
          answer_source: q.answer_source === "key" ? "key" : "ai",
          explanation: q.explanation || "",
          figure: q.figure
            ? {
                page: q.figure.page,
                x0: q.figure.x0,
                y0: q.figure.y0,
                x1: q.figure.x1,
                y1: q.figure.y1,
              }
            : null,
        };
      });

      return { questions };
    } catch (error) {
      // Fallback: If structured output threw NoObjectGeneratedError, attempt regex JSON extraction
      if (NoObjectGeneratedError.isInstance(error) && error.text) {
        try {
          const match = error.text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]) as { questions?: Array<Record<string, unknown>> };
            if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
              const questions: PdfDraftQuestion[] = parsed.questions.map((q, idx) => {
                const opts = Array.isArray(q["options"]) ? q["options"].map(String) : [];
                const isNat = String(q["qtype"]).toUpperCase() === "NAT" || opts.length === 0;
                return {
                  question_number: Number(q["question_number"]) || idx + 1,
                  subject: normalizeSubject(String(q["subject"] ?? "")),
                  topic: String(q["topic"] ?? "General"),
                  qtype: normalizeQType(String(q["qtype"] ?? ""), opts.length),
                  marks: Number(q["marks"]) === 2 ? 2 : 1,
                  question: String(q["question"] ?? "").trim(),
                  options: isNat ? [] : opts,
                  correct: Array.isArray(q["correct"]) ? q["correct"].map(Number) : [],
                  nat_answer: isNat ? String(q["nat_answer"] ?? "") : null,
                  answer_source: q["answer_source"] === "key" ? "key" : "ai",
                  explanation: String(q["explanation"] ?? ""),
                  figure: null,
                };
              });
              return { questions };
            }
          }
        } catch {
          // ignore fallback parse error, continue to error reporting
        }
      }

      console.error("extractPyqFromPages error:", error);
      throw new Error(formatAiError(error));
    }
  });
