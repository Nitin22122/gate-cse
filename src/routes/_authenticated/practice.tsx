add this ai option to add question in the 2nd image code https://gate-cse-two.vercel.app/practice

Yes. You want the second /practice page to keep its current Manual Entry form, but add the “Use AI to Submit” mode shown in your first screenshot.

I checked your live /practice page: GATE CSE Practice page.

What should be added

The existing page:

Manual Entry

Subject
Type
Difficulty
Source Tag
Question
Options
Correct option
Explanation
Submit for Review

should become:

STEP 2: CHOOSE SUBMISSION METHOD

✎ Manual Entry | 🤖 Use AI to Submit

When Manual Entry is selected, show your existing form.

When Use AI to Submit is selected, show:

Default Source Tag
Clear Cached AI Data
Instructions
Copyable AI prompt
AI output textarea
Preview Parsed Questions
Parsed question cards
Submit selected/all questions for review

The important part is that the AI output can contain multiple questions, so the parser should automatically convert:

SUBJECT: DBMS
TYPE: MCQ
DIFFICULTY: Medium
QUESTION: ...
OPTIONS: A ; ... ; B ; ... ; C ; ... ; D ; ...
ANSWER: B
EXPLANATION: ...

into your normal question objects.

Recommended implementation

Since I don't have the source code of your /practice component in the uploaded files, I can't safely patch your exact existing component without guessing its state/API names.

Send/upload the file that currently renders:

/practice

—for example something like:

Practice.jsx
Practice.tsx
practice/page.tsx
routes/practice.tsx

and, if separate, the question submission service/API file.

Then I can modify the actual code so the result is:

┌─────────────────────────────────────────────┐
│ STEP 2: CHOOSE SUBMISSION METHOD            │
│                                             │
│  ✎ Manual Entry       │  🤖 Use AI to Submit│
└─────────────────────────────────────────────┘

             AI MODE

Default Source Tag: [ Untagged ▼ ]

[ 🗑 Clear Cached AI Data ]

┌─────────────────────────────────────────────┐
│ 🤖 Instructions                             │
│                                             │
│ 1. Ensure your name is entered correctly.   │
│ 2. Copy the system prompt below.            │
│ 3. Paste it into ChatGPT/Gemini.            │
│ 4. Give Question + 4 options + explanation. │
│ 5. Paste formatted output below.             │
│ 6. Duplicate questions are discarded.       │
│                                             │
│ [ AI PROMPT                         ][Copy]  │
└─────────────────────────────────────────────┘

Paste AI Output Below

┌─────────────────────────────────────────────┐
│ SUBJECT: ...                                │
│ TYPE: ...                                   │
│ DIFFICULTY: ...                             │
│ QUESTION: ...                               │
│ OPTIONS: A ; B ; C ; D                     │
│ ANSWER: B                                   │
│ EXPLANATION: ...                            │
└─────────────────────────────────────────────┘

        [ 👁 Preview Parsed Questions ]

┌─────────────────────────────────────────────┐
│ ✓ 3 questions detected                      │
│                                             │
│ DBMS • MCQ • Medium                         │
│ Question preview...                         │
│                                             │
│ [✓ Include]                                 │
└─────────────────────────────────────────────┘

        [ Submit Questions for Review ]

I would also make the AI parser handle MCQ, MSQ and NAT, validate missing fields, reject malformed AI output, and automatically discard duplicates before submission.

Upload the /practice page code, and I'll give you the exact modified file rather than a generic replacement.

Pasted code.ts
TypeScript

Done. I added the “Use AI to Submit” option to your existing /practice code while preserving the current manual submission flow. Your original Contribute() component already uses submitQuestion() for individual submissions, so the AI mode reuses that same backend path rather than requiring a new API endpoint.

Added features
Manual Entry / Use AI to Submit toggle
Default Source Tag for AI questions
Clear Cached AI Data
Full AI-generation prompt with Copy Prompt
AI output textarea
Preview Parsed Questions
Automatic parsing of:
SUBJECT
TYPE
DIFFICULTY
QUESTION
OPTIONS
ANSWER
EXPLANATION
Supports multiple questions in one AI response
Automatically removes duplicate questions from the same AI output
Individual question selection with checkboxes
Select All / Deselect All
Preview of options and correct answer
Submit multiple AI-generated questions for review
Uses the existing submitQuestion() function, so your existing review workflow remains intact
Saves pasted AI output in localStorage
Reset functionality
Toast notifications for parsing/submission/errors
Updated file

Download the modified practice-ai.tsx

Replace your current /practice route file with this version.

Important: This implementation matches the AI workflow in your screenshot: the user copies the generated prompt to ChatGPT/Gemini, gets formatted questions, pastes the output back, previews it, and submits. It does not require an OpenAI/Gemini API key.

If you want the AI button itself to directly generate questions inside your website without leaving the site, that is a separate step requiring an AI API/backend integration. 

practice-ai.tsx
Code

practice-ai.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Clock,
  Search,
  SkipForward,
  Send,
  Trash2,
  Trophy,
  XCircle,
  Copy,
  Eye,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRACTICE_LEVELS,
  PRACTICE_SUBJECTS,
  PRACTICE_TAGS,
  PRACTICE_TYPES,
  deleteQuestion,
  fetchPracticeQuestions,
  fetchLeaderboard,
  fetchMyAttempts,
  fetchMyQuestions,
  fetchProfile,
  recordAttempt,
  submitQuestion,
  type PracticeQuestion,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Practice Arena — GATE 2027 Study Tracker" },
      {
        name: "description",
        content:
          "Solve community-contributed GATE questions, track accuracy, contribute your own questions and climb the leaderboard.",
      },
      { property: "og:title", content: "Practice Arena — GATE 2027 Study Tracker" },
      {
        property: "og:description",
        content: "Solve GATE practice questions, check submission status and see the leaderboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PracticePage,
});

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function PracticePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Practice Arena</h1>
      <Tabs defaultValue="arena" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="arena">
            <Brain className="mr-2 size-4" /> Practice Arena
          </TabsTrigger>
          <TabsTrigger value="status">
            <Search className="mr-2 size-4" /> Question Status
          </TabsTrigger>
          <TabsTrigger value="board">
            <Trophy className="mr-2 size-4" /> Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arena">
          <Arena />
        </TabsContent>
        <TabsContent value="status" className="space-y-6">
          <Contribute />
          <MyQuestions />
        </TabsContent>
        <TabsContent value="board">
          <Leaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Arena() {
  const qc = useQueryClient();
  const questions = useQuery({ queryKey: ["practice-approved"], queryFn: fetchPracticeQuestions });
  const attempts = useQuery({ queryKey: ["practice-attempts"], queryFn: fetchMyAttempts });

  const [subject, setSubject] = useState("all");
  const [level, setLevel] = useState("all");
  const [tag, setTag] = useState("all");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const list = useMemo(() => {
    const all = questions.data ?? [];
    return all.filter(
      (q) =>
        (subject === "all" || q.subject === subject) &&
        (level === "all" || q.difficulty === level) &&
        (tag === "all" || q.tag === tag),
    );
  }, [questions.data, subject, level, tag]);

  const stats = useMemo(() => {
    const rows = attempts.data ?? [];
    const solved = rows.filter((a) => a.is_correct).length;
    const tried = rows.filter((a) => !a.skipped).length;
    return { solved, tried, pct: tried ? Math.round((solved / tried) * 100) : 0 };
  }, [attempts.data]);

  const save = useMutation({
    mutationFn: recordAttempt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["practice-attempts"] }),
  });

  const q: PracticeQuestion | undefined = list[index];

  function next() {
    setSelected(null);
    setRevealed(false);
    setIndex((i) => (list.length ? (i + 1) % list.length : 0));
  }

  function submit() {
    if (!q || selected === null) return;
    setRevealed(true);
    save.mutate({
      question_id: q.id,
      selected_index: selected,
      is_correct: selected === q.correct_index,
      skipped: false,
    });
  }

  function skip() {
    if (q) save.mutate({ question_id: q.id, selected_index: null, is_correct: false, skipped: true });
    next();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={subject} onChange={setSubject} label="All Subjects" options={PRACTICE_SUBJECTS} />
        <FilterSelect value={level} onChange={setLevel} label="All Levels" options={PRACTICE_LEVELS} />
        <FilterSelect value={tag} onChange={setTag} label="All Tags" options={PRACTICE_TAGS} />
        <div className="ml-auto rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold">
          Score: {stats.solved} / {stats.tried} ({stats.pct}%)
        </div>
      </div>

      {questions.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading questions…</p>
      ) : !q ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No approved questions match these filters yet. Contribute one from the Question Status tab.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
            <span>{q.subject}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{q.qtype}</span>
            <Badge variant="secondary">Q.{index + 1}</Badge>
            <Badge variant="outline">{q.tag}</Badge>
            <Badge variant="outline">{q.difficulty}</Badge>
            {q.author_name && (
              <span className="text-xs text-muted-foreground">By: {q.author_name}</span>
            )}
          </div>

          <p className="mt-5 text-lg font-semibold leading-relaxed">{q.question}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              const correct = revealed && i === q.correct_index;
              const wrong = revealed && i === selected && i !== q.correct_index;
              return (
                <button
                  key={i}
                  onClick={() => !revealed && setSelected(i)}
                  className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                    correct
                      ? "border-primary bg-primary/10"
                      : wrong
                        ? "border-destructive bg-destructive/10"
                        : selected === i
                          ? "border-primary bg-accent"
                          : "border-border hover:bg-accent"
                  }`}
                >
                  <span className="mr-2 font-bold text-primary">{LETTERS[i]}.</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                {selected === q.correct_index ? (
                  <>
                    <CheckCircle2 className="size-4 text-primary" /> Correct!
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-destructive" /> Correct answer:{" "}
                    {LETTERS[q.correct_index]}
                  </>
                )}
              </p>
              {q.explanation && <p className="mt-2 text-muted-foreground">{q.explanation}</p>}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {!revealed ? (
              <Button onClick={submit} disabled={selected === null}>
                Submit answer
              </Button>
            ) : (
              <Button onClick={next}>Next question</Button>
            )}
            <Button variant="secondary" onClick={skip}>
              <SkipForward className="mr-2 size-4" /> Skip
            </Button>
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> {list.length} questions in this set
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Contribute() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const [mode, setMode] = useState<"manual" | "ai">("manual");

  // Manual form state
  const [subject, setSubject] = useState<string>(PRACTICE_SUBJECTS[0]);
  const [qtype, setQtype] = useState<string>(PRACTICE_TYPES[0]);
  const [difficulty, setDifficulty] = useState<string>("Medium");
  const [tag, setTag] = useState<string>("Untagged");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correct, setCorrect] = useState("1");
  const [explanation, setExplanation] = useState("");

  // AI submission state
  const [aiTag, setAiTag] = useState<string>("Untagged");
  const [aiOutput, setAiOutput] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<AIParsedQuestion[]>([]);
  const [selectedAIQuestions, setSelectedAIQuestions] = useState<number[]>([]);
  const [aiPreviewed, setAiPreviewed] = useState(false);
  const [copied, setCopied] = useState(false);

  const options = optionsText
    .split(";;")
    .map((o) => o.trim())
    .filter(Boolean);

  const send = useMutation({
    mutationFn: () =>
      submitQuestion({
        subject,
        qtype,
        difficulty,
        tag,
        question: question.trim(),
        options,
        correct_index: Math.max(0, Math.min(options.length - 1, Number(correct) - 1)),
        explanation: explanation.trim(),
        author_name: profile.data?.display_name ?? null,
      }),
    onSuccess: () => {
      setQuestion("");
      setOptionsText("");
      setExplanation("");
      setCorrect("1");
      toast.success("Submitted for review");
      qc.invalidateQueries({ queryKey: ["practice-mine"] });
    },
    onError: () => toast.error("Could not submit question"),
  });

  const submitAI = useMutation({
    mutationFn: async () => {
      const chosen = parsedQuestions.filter((_, i) => selectedAIQuestions.includes(i));

      if (!chosen.length) {
        throw new Error("Select at least one parsed question");
      }

      // Submit one-by-one because the existing data layer exposes submitQuestion
      // for individual questions.
      for (const q of chosen) {
        await submitQuestion({
          subject: q.subject,
          qtype: q.qtype,
          difficulty: q.difficulty,
          tag: q.tag || aiTag,
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
          author_name: profile.data?.display_name ?? null,
        });
      }

      return chosen.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} question${count === 1 ? "" : "s"} submitted for review`);
      setAiOutput("");
      setParsedQuestions([]);
      setSelectedAIQuestions([]);
      setAiPreviewed(false);
      localStorage.removeItem("gate-ai-question-output");
      qc.invalidateQueries({ queryKey: ["practice-mine"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not submit AI questions");
    },
  });

  const valid = question.trim().length > 5 && options.length >= 2;

  const aiPrompt = `Act as an expert GATE CS problem generator. Generate practice questions for GATE Computer Science.

Write the Answers and Explanations of the Provided Questions below in the exact format.

Constraints:
1. Allowed Subjects: ${PRACTICE_SUBJECTS.join(", ")}.
2. Generate high-quality GATE-level questions.
3. For MCQ/MSQ, provide 4 options.
4. For NAT, provide the numeric answer in ANSWER.
5. Keep the explanation concise but mathematically/technically correct.
6. Use plain text only for labels. Do not use markdown formatting.

IMPORTANT: Return ONLY questions in this exact format. You may return multiple questions by repeating the block.

SUBJECT: DBMS
TYPE: MCQ
DIFFICULTY: Medium
QUESTION: Your question here
OPTIONS: Option A ;; Option B ;; Option C ;; Option D
ANSWER: B
EXPLANATION: Explain why the answer is correct.

Give Question + 4 options + explanation to the AI and ask it to format them properly using the above prompt.`;

  function parseAIOutput(raw: string): AIParsedQuestion[] {
    const normalized = raw
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    if (!normalized) return [];

    // Supports multiple blocks even when the AI inserts blank lines between them.
    const blocks = normalized
      .split(/(?=^\s*SUBJECT\s*:)/im)
      .map((block) => block.trim())
      .filter(Boolean);

    const result: AIParsedQuestion[] = [];

    for (const block of blocks) {
      const getField = (name: string) => {
        const match = block.match(
          new RegExp(`^\\s*${name}\\s*:\\s*(.*?)(?=\\n\\s*[A-Z][A-Z _-]*\\s*:|$)`, "ims"),
        );
        return match?.[1]?.trim() ?? "";
      };

      const rawSubject = getField("SUBJECT");
      const rawType = getField("TYPE");
      const rawDifficulty = getField("DIFFICULTY");
      const rawQuestion = getField("QUESTION");
      const rawOptions = getField("OPTIONS");
      const rawAnswer = getField("ANSWER");
      const rawExplanation = getField("EXPLANATION");
      const rawTag = getField("TAG") || getField("SOURCE TAG");

      const subjectMatch = PRACTICE_SUBJECTS.find(
        (item) => item.toLowerCase() === rawSubject.toLowerCase(),
      );
      const typeMatch = PRACTICE_TYPES.find(
        (item) => item.toLowerCase() === rawType.toLowerCase(),
      );
      const difficultyMatch = PRACTICE_LEVELS.find(
        (item) => item.toLowerCase() === rawDifficulty.toLowerCase(),
      );

      const parsedOptions = rawOptions
        .split(/\s*;;\s*/)
        .map((item) => item.trim())
        .filter(Boolean);

      const answerLetter = rawAnswer
        .trim()
        .replace(/[.)\s]+$/, "")
        .toUpperCase();

      let correctIndex = -1;

      if (/^[A-Z]$/.test(answerLetter)) {
        correctIndex = answerLetter.charCodeAt(0) - 65;
      } else if (/^\d+$/.test(answerLetter)) {
        correctIndex = Number(answerLetter) - 1;
      }

      if (
        !subjectMatch ||
        !typeMatch ||
        !difficultyMatch ||
        rawQuestion.length <= 5 ||
        parsedOptions.length < 2 ||
        correctIndex < 0 ||
        correctIndex >= parsedOptions.length
      ) {
        continue;
      }

      result.push({
        subject: subjectMatch,
        qtype: typeMatch,
        difficulty: difficultyMatch,
        tag: PRACTICE_TAGS.includes(rawTag) ? rawTag : aiTag,
        question: rawQuestion,
        options: parsedOptions,
        correct_index: correctIndex,
        explanation: rawExplanation,
      });
    }

    // Automatically discard exact duplicate questions in the same AI paste.
    const seen = new Set<string>();
    return result.filter((q) => {
      const key = `${q.subject}|${q.question.toLowerCase().replace(/\s+/g, " ").trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function previewAI() {
    const parsed = parseAIOutput(aiOutput);
    setParsedQuestions(parsed);
    setSelectedAIQuestions(parsed.map((_, i) => i));
    setAiPreviewed(true);

    if (!parsed.length) {
      toast.error("No valid questions found. Check the required AI output format.");
    } else {
      toast.success(`${parsed.length} question${parsed.length === 1 ? "" : "s"} parsed`);
    }

    localStorage.setItem("gate-ai-question-output", aiOutput);
  }

  function clearAIData() {
    setAiOutput("");
    setParsedQuestions([]);
    setSelectedAIQuestions([]);
    setAiPreviewed(false);
    setCopied(false);
    localStorage.removeItem("gate-ai-question-output");
    toast.success("Cached AI data cleared");
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setCopied(true);
      toast.success("AI prompt copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the prompt");
    }
  }

  function toggleAIQuestion(index: number) {
    setSelectedAIQuestions((current) =>
      current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index],
    );
  }

  function switchMode(nextMode: "manual" | "ai") {
    setMode(nextMode);

    if (nextMode === "ai") {
      const cached = localStorage.getItem("gate-ai-question-output");
      if (cached && !aiOutput) {
        setAiOutput(cached);
      }
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-extrabold text-primary">Contribute a Question!</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Help build the practice database. All questions are reviewed before going live.
      </p>

      {/* Submission method */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Step 2: Choose Submission Method
        </p>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => switchMode("manual")}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
              mode === "manual"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Send className="size-4" />
            Manual Entry
          </button>

          <button
            type="button"
            onClick={() => switchMode("ai")}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
              mode === "ai"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Brain className="size-4" />
            Use AI to Submit
          </button>
        </div>
      </div>

      {mode === "manual" ? (
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <PickerSelect value={subject} onChange={setSubject} options={PRACTICE_SUBJECTS} />
            <PickerSelect value={qtype} onChange={setQtype} options={PRACTICE_TYPES} />
            <PickerSelect value={difficulty} onChange={setDifficulty} options={PRACTICE_LEVELS} />
            <PickerSelect value={tag} onChange={setTag} options={PRACTICE_TAGS} />
          </div>

          <Textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here..."
          />

          <Textarea
            rows={3}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="Options separated by ;; (e.g. O(1) ;; O(n) ;; O(n^2))"
          />

          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="correct">Correct option number</Label>
            <Input
              id="correct"
              type="number"
              min={1}
              max={Math.max(options.length, 1)}
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
            />
          </div>

          <Textarea
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explanation (Optional)"
          />

          <Button
            className="w-full"
            disabled={!valid || send.isPending}
            onClick={() => send.mutate()}
          >
            <Send className="mr-2 size-4" />
            {send.isPending ? "Submitting…" : "Submit for Review"}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Default source tag */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-xs">
                <Label>Default Source Tag for All Submitting Qs</Label>
                <div className="mt-2">
                  <PickerSelect value={aiTag} onChange={setAiTag} options={PRACTICE_TAGS} />
                </div>
              </div>

              <Button type="button" variant="destructive" size="sm" onClick={clearAIData}>
                <Trash2 className="mr-2 size-4" />
                Clear Cached AI Data
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Brain className="size-4" />
              Instructions
            </div>

            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Ensure your name is entered correctly above.</li>
              <li>Copy the system prompt below.</li>
              <li>Paste it into ChatGPT/Gemini along with your raw question text, options and explanation.</li>
              <li>Copy the AI&apos;s exact formatted output and paste it into the box below.</li>
              <li>Do not submit duplicate questions; duplicates in the same paste are automatically discarded.</li>
            </ol>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label>AI System Prompt</Label>
                <Button type="button" variant="secondary" size="sm" onClick={copyPrompt}>
                  <Copy className="mr-2 size-4" />
                  {copied ? "Copied" : "Copy Prompt"}
                </Button>
              </div>

              <Textarea
                readOnly
                rows={10}
                value={aiPrompt}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          </div>

          {/* AI output */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Paste AI Output Below</Label>
              {aiOutput && (
                <span className="text-xs text-muted-foreground">
                  {aiOutput.length.toLocaleString()} characters
                </span>
              )}
            </div>

            <Textarea
              rows={10}
              value={aiOutput}
              onChange={(e) => {
                setAiOutput(e.target.value);
                setAiPreviewed(false);
              }}
              placeholder={`SUBJECT: DBMS
TYPE: MCQ
DIFFICULTY: Medium
QUESTION: ...
OPTIONS: A ; B ; C ; D
ANSWER: B
EXPLANATION: ...`}
              className="font-mono text-xs"
            />

            <Button
              type="button"
              className="mt-3 w-full"
              disabled={!aiOutput.trim()}
              onClick={previewAI}
            >
              <Eye className="mr-2 size-4" />
              Preview Parsed Questions
            </Button>
          </div>

          {/* Parsed preview */}
          {aiPreviewed && (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold">Parsed Questions</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {parsedQuestions.length} valid question
                    {parsedQuestions.length === 1 ? "" : "s"} detected.
                    {" "}
                    {selectedAIQuestions.length} selected for submission.
                  </p>
                </div>

                {parsedQuestions.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setSelectedAIQuestions(
                        selectedAIQuestions.length === parsedQuestions.length
                          ? []
                          : parsedQuestions.map((_, i) => i),
                      )
                    }
                  >
                    {selectedAIQuestions.length === parsedQuestions.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                )}
              </div>

              {parsedQuestions.length === 0 ? (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  No valid questions were parsed. Check SUBJECT, TYPE, DIFFICULTY, QUESTION,
                  OPTIONS and ANSWER fields and try again.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {parsedQuestions.map((q, index) => (
                    <label
                      key={`${index}-${q.question}`}
                      className={`block cursor-pointer rounded-xl border p-4 transition-colors ${
                        selectedAIQuestions.includes(index)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <div className="flex gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-primary"
                          checked={selectedAIQuestions.includes(index)}
                          onChange={() => toggleAIQuestion(index)}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <Badge>{q.subject}</Badge>
                            <Badge variant="secondary">{q.qtype}</Badge>
                            <Badge variant="outline">{q.difficulty}</Badge>
                            <Badge variant="outline">{q.tag}</Badge>
                          </div>

                          <p className="mt-2 text-sm font-semibold leading-relaxed">
                            {index + 1}. {q.question}
                          </p>

                          <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            {q.options.map((option, optionIndex) => (
                              <span
                                key={optionIndex}
                                className={
                                  optionIndex === q.correct_index
                                    ? "font-semibold text-primary"
                                    : undefined
                                }
                              >
                                {LETTERS[optionIndex] ?? String(optionIndex + 1)}. {option}
                              </span>
                            ))}
                          </div>

                          {q.explanation && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Explanation: {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!selectedAIQuestions.length || submitAI.isPending}
                  onClick={() => submitAI.mutate()}
                >
                  <Send className="mr-2 size-4" />
                  {submitAI.isPending
                    ? "Submitting…"
                    : `Submit ${selectedAIQuestions.length || ""} Question${
                        selectedAIQuestions.length === 1 ? "" : "s"
                      } for Review`}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitAI.isPending}
                  onClick={() => {
                    setAiOutput("");
                    setParsedQuestions([]);
                    setSelectedAIQuestions([]);
                    setAiPreviewed(false);
                  }}
                >
                  <RotateCcw className="mr-2 size-4" />
                  Reset
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type AIParsedQuestion = {
  subject: string;
  qtype: string;
  difficulty: string;
  tag: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

function PickerSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MyQuestions() {
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ["practice-mine"], queryFn: fetchMyQuestions });
  const remove = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["practice-mine"] }),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold">Your submissions</h2>
      <div className="mt-4 space-y-3">
        {(mine.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        )}
        {(mine.data ?? []).map((q) => (
          <div
            key={q.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-background p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{q.question}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {q.subject} • {q.qtype} • {q.difficulty} • {q.tag}
              </p>
            </div>
            <Badge variant={q.status === "approved" ? "default" : "secondary"}>{q.status}</Badge>
            <Button variant="ghost" size="sm" onClick={() => remove.mutate(q.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Leaderboard() {
  const board = useQuery({ queryKey: ["practice-board"], queryFn: fetchLeaderboard });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold">Leaderboard</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">#</th>
              <th className="py-2">Aspirant</th>
              <th className="py-2">Solved</th>
              <th className="py-2">Accuracy</th>
              <th className="py-2">Contributed</th>
            </tr>
          </thead>
          <tbody>
            {(board.data ?? []).map((row, i) => (
              <tr key={row.user_id} className="border-t border-border">
                <td className="py-2 font-semibold">{i + 1}</td>
                <td className="py-2">{row.display_name}</td>
                <td className="py-2">{row.solved}</td>
                <td className="py-2">{row.accuracy}%</td>
                <td className="py-2">{row.contributed}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(board.data ?? []).length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No ranked aspirants yet.</p>
        )}
      </div>
    </div>
  );
}
