import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SUBJECTS = [
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

const figureSchema = z
  .object({
    page: z.number().describe("1-based page number (as labelled in the input) where the figure is"),
    x0: z.number().describe("left edge, 0-1000 of page width"),
    y0: z.number().describe("top edge, 0-1000 of page height"),
    x1: z.number().describe("right edge, 0-1000 of page width"),
    y1: z.number().describe("bottom edge, 0-1000 of page height"),
  })
  .strict();

const questionSchema = z
  .object({
    question_number: z.number(),
    subject: z.enum(SUBJECTS),
    topic: z.string(),
    qtype: z.enum(["MCQ", "MSQ", "NAT"]),
    marks: z.number(),
    question: z.string(),
    options: z.array(z.string()),
    correct: z.array(z.number()).describe("1-based correct option numbers; empty for NAT"),
    nat_answer: z.string().nullable().describe("NAT answer, e.g. '12.5' or range '4.0 to 4.2'"),
    answer_source: z.enum(["key", "ai"]),
    explanation: z.string(),
    figure: figureSchema.nullable(),
  })
  .strict();

const outputSchema = z.object({ questions: z.array(questionSchema) }).strict();

export type PdfDraftQuestion = z.infer<typeof questionSchema>;

const inputSchema = z.object({
  pages: z
    .array(z.object({ page: z.number().int().min(1), image: z.string().min(20) }))
    .min(1)
    .max(4),
  year: z.number().int().min(1990).max(2100),
  paper: z.string().max(20),
  answerKey: z.string().max(40000).nullable(),
});

export const extractPyqFromPages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output, NoObjectGeneratedError } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./run-id.server");

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: runIdFetch.fetch,
    });

    const instructions = [
      `You extract GATE ${data.paper} ${data.year} questions from scanned exam paper pages.`,
      "Extract EVERY question whose text appears on these pages, including General Aptitude. Skip instructions/cover pages.",
      "Copy question and option text faithfully. Write math in plain text (e.g. x^2, log n, sqrt(n), <=). Do not include option letters in option text.",
      "qtype: MCQ (one correct), MSQ (one or more correct, often marked 'MSQ' or 'select all'), NAT (numerical answer, no options).",
      "marks: 1 or 2, from section headings (Q.1-Q.5 and Q.11-Q.35 are usually 1 mark; read headings when present).",
      "If an answer key is provided, use it (answer_source 'key'; NAT ranges like '4.0 to 4.2'). Otherwise solve it carefully yourself (answer_source 'ai').",
      "correct holds 1-based option numbers (A=1). For NAT, correct is [] and nat_answer is set; otherwise nat_answer is null.",
      "explanation: a concise step-by-step solution, plain text.",
      "topic: a short GATE syllabus topic like 'Normalization' or 'Pipelining'.",
      "figure: if the question relies on a diagram, table image, graph, circuit or code screenshot that cannot be represented as text, give a tight bounding box around it (0-1000 coordinates, page as labelled). Otherwise null.",
      "If a question is cut off at the end of the last page, still include what is visible.",
    ].join("\n");

    const content: Array<
      { type: "text"; text: string } | { type: "file"; data: string; mediaType: string }
    > = [];
    for (const p of data.pages) {
      content.push({ type: "text", text: `Page ${p.page}:` });
      const base64 = p.image.replace(/^data:[^;]+;base64,/, "");
      content.push({ type: "file", data: base64, mediaType: "image/jpeg" });
    }
    if (data.answerKey) {
      content.push({ type: "text", text: `Official answer key text:\n${data.answerKey}` });
    }
    content.push({ type: "text", text: "Extract all questions from these pages." });

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system: instructions,
        messages: [{ role: "user", content }],
        output: Output.object({ schema: outputSchema }),
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "medium",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const output = await result.output;
      return { questions: output.questions };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("AI could not read these pages cleanly. Try this batch again.");
      }
      const status =
        (error as { statusCode?: number }).statusCode ?? (error as { status?: number }).status;
      if (status === 429) throw new Error("AI is busy (rate limited). Wait a minute and resume.");
      if (status === 402) throw new Error("AI credits are used up for this workspace. Add credits to continue.");
      if (status === 403) throw new Error("AI access was denied for this request.");
      console.error("extractPyqFromPages failed", error);
      throw new Error("AI extraction failed for these pages.");
    }
  });
