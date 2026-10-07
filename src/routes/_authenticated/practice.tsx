import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Clock,
  Pencil,
  Search,
  SkipForward,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  XCircle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { PracticePdfImporter } from "@/components/PracticePdfImporter";

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
  checkNatAnswer,
  practiceCorrectSet,
  pyqImageUrl,
  uploadPyqImage,
  submitQuestion,
  submitQuestions,
  type PracticeQuestion,
} from "@/lib/data";
import {
  formatQuestionsWithAI,
  type AiDraftQuestion,
} from "@/lib/practice-ai.functions";

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

function PracticeImage({ path }: { path: string }) {
  const url = useQuery({ queryKey: ["pyq-img", path], queryFn: () => pyqImageUrl(path), staleTime: 50 * 60 * 1000 });
  if (!url.data) return <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted" />;
  return <img src={url.data} alt="Question figure" className="mt-4 max-h-96 rounded-xl border border-border bg-background object-contain" />;
}

function Arena() {
  const qc = useQueryClient();
  const questions = useQuery({ queryKey: ["practice-approved"], queryFn: fetchPracticeQuestions });
  const attempts = useQuery({ queryKey: ["practice-attempts"], queryFn: fetchMyAttempts });

  const [subject, setSubject] = useState("all");
  const [level, setLevel] = useState("all");
  const [tag, setTag] = useState("all");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [natInput, setNatInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);

  const list = useMemo(() => {
    const all = questions.data ?? [];
    return all.filter(
      (q) =>
        (subject === "all" || q.subject === subject) &&
        (level === "all" || q.difficulty === level) &&
        (tag === "all" || q.tag === tag),
    );
  }, [questions.data, subject, level, tag]);

  // One result per question: the latest non-skipped attempt.
  const stats = useMemo(() => {
    const latest = new Map<string, boolean>();
    for (const a of attempts.data ?? []) {
      if (a.skipped || latest.has(a.question_id)) continue;
      latest.set(a.question_id, a.is_correct);
    }
    const tried = latest.size;
    const solved = [...latest.values()].filter(Boolean).length;
    return { solved, tried, pct: tried ? Math.round((solved / tried) * 100) : 0 };
  }, [attempts.data]);

  const save = useMutation({
    mutationFn: recordAttempt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["practice-attempts"] }),
  });

  const q: PracticeQuestion | undefined = list[index];
  const isNat = !!q && (q.qtype === "NAT" || q.options.length === 0);
  const isMsq = !!q && q.qtype === "MSQ";
  const correctSet = q ? practiceCorrectSet(q) : [];

  function next() {
    setSelected([]);
    setNatInput("");
    setRevealed(false);
    setIndex((i) => (list.length ? (i + 1) % list.length : 0));
  }

  function choose(i: number) {
    if (revealed) return;
    setSelected((s) => (isMsq ? (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort()) : [i]));
  }

  function submit() {
    if (!q) return;
    let ok: boolean;
    if (isNat) ok = checkNatAnswer(natInput, q.nat_answer);
    else {
      const a = [...selected].sort().join(",");
      const b = [...correctSet].sort().join(",");
      ok = a === b;
    }
    setLastCorrect(ok);
    setRevealed(true);
    save.mutate({
      question_id: q.id,
      selected_index: isNat ? null : (selected[0] ?? null),
      selected_indices: isNat ? null : selected,
      nat_input: isNat ? natInput.trim() : null,
      is_correct: ok,
      skipped: false,
    });
  }

  function skip() {
    if (q) save.mutate({ question_id: q.id, selected_index: null, is_correct: false, skipped: true });
    next();
  }

  const canSubmit = isNat ? natInput.trim() !== "" : selected.length > 0;

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
            <span className="text-muted-foreground">{isNat ? "NAT" : q.qtype}</span>
            <Badge variant="secondary">Q.{index + 1}</Badge>
            <Badge variant="outline">{q.tag}</Badge>
            <Badge variant="outline">{q.difficulty}</Badge>
            {q.author_name && <span className="text-xs text-muted-foreground">By: {q.author_name}</span>}
          </div>

          <p className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-relaxed">{q.question}</p>
          {q.image_path && <PracticeImage path={q.image_path} />}
          {isMsq && !revealed && (
            <p className="mt-3 text-xs text-muted-foreground">Select all correct options.</p>
          )}

          {isNat ? (
            <div className="mt-5 max-w-xs">
              <Label htmlFor="nat-answer">Your answer</Label>
              <Input
                id="nat-answer"
                inputMode="decimal"
                value={natInput}
                disabled={revealed}
                onChange={(e) => setNatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && !revealed && submit()}
                placeholder="e.g. 12.5"
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {q.options.map((opt, i) => {
                const isPicked = selected.includes(i);
                const correct = revealed && correctSet.includes(i);
                const wrong = revealed && isPicked && !correctSet.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    aria-pressed={isPicked}
                    className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                      correct
                        ? "border-primary bg-primary/10"
                        : wrong
                          ? "border-destructive bg-destructive/10"
                          : isPicked
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
          )}

          {revealed && (
            <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                {lastCorrect ? (
                  <>
                    <CheckCircle2 className="size-4 text-primary" /> Correct!
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-destructive" /> Correct answer:{" "}
                    {isNat ? (q.nat_answer ?? "—") : correctSet.map((i) => LETTERS[i]).join(", ")}
                  </>
                )}
              </p>
              {q.explanation && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{q.explanation}</p>}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {!revealed ? (
              <Button onClick={submit} disabled={!canSubmit}>
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
  const [mode, setMode] = useState<"manual" | "ai" | "pdf">("manual");

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-extrabold text-primary">Contribute a Question!</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Questions you add go live in the shared Practice Arena for every aspirant.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border bg-background p-1">
        {([
          ["manual", "Manual Entry", Pencil],
          ["ai", "Use AI to Submit", Sparkles],
          ["pdf", "Import PDF", FileText],
        ] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="mr-2 inline size-4" /> {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {mode === "manual" ? <ManualEntry /> : mode === "ai" ? <AiEntry /> : <PracticePdfImporter />}
      </div>
    </div>
  );
}

function ManualEntry() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const [subject, setSubject] = useState<string>(PRACTICE_SUBJECTS[0]);
  const [qtype, setQtype] = useState<string>(PRACTICE_TYPES[0]);
  const [difficulty, setDifficulty] = useState<string>("Medium");
  const [tag, setTag] = useState<string>("Untagged");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correct, setCorrect] = useState("1");
  const [explanation, setExplanation] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const isNat = qtype === "NAT";

  const options = optionsText
    .split(";;")
    .map((o) => o.trim())
    .filter(Boolean);

  const send = useMutation({
    mutationFn: async () => {
      const idx = correct
        .split(/[,\s]+/)
        .map((n) => Number(n) - 1)
        .filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
      const image_path = image ? await uploadPyqImage(image) : null;
      return submitQuestion({
        subject,
        qtype,
        difficulty,
        tag,
        question: question.trim(),
        options: isNat ? [] : options,
        correct_index: isNat ? 0 : (idx[0] ?? 0),
        correct_indices: isNat ? null : [...new Set(idx)].sort(),
        nat_answer: isNat ? correct.trim() : null,
        image_path,
        explanation: explanation.trim(),
        author_name: profile.data?.display_name ?? null,
      });
    },
    onSuccess: () => {
      setImage(null);
      setQuestion("");
      setOptionsText("");
      setExplanation("");
      toast.success("Question published to the arena");
      qc.invalidateQueries({ queryKey: ["practice-mine"] });
      qc.invalidateQueries({ queryKey: ["practice-approved"] });
    },
    onError: () => toast.error("Could not submit question"),
  });

  const valid = question.trim().length > 5 && (isNat ? correct.trim() !== "" : options.length >= 2);

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-4">
        <PickerSelect value={subject} onChange={setSubject} options={PRACTICE_SUBJECTS} />
        <PickerSelect value={qtype} onChange={setQtype} options={PRACTICE_TYPES} />
        <PickerSelect value={difficulty} onChange={setDifficulty} options={PRACTICE_LEVELS} />
        <PickerSelect value={tag} onChange={setTag} options={PRACTICE_TAGS} />
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type your question here..."
        />
        <div className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="q-image">Picture (optional)</Label>
          <Input id="q-image" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        </div>
        {!isNat && (
          <Textarea
            rows={3}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="Options separated by ;; (e.g. O(1) ;; O(n) ;; O(n^2))"
          />
        )}
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="correct">
            {isNat ? "Answer (number or range, e.g. 12.5 or 4.0 to 4.2)" : qtype === "MSQ" ? "Correct option numbers (e.g. 2,4)" : "Correct option number"}
          </Label>
          <Input id="correct" value={correct} onChange={(e) => setCorrect(e.target.value)} />
        </div>
        <Textarea
          rows={3}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explanation (Optional)"
        />
        <Button className="w-full" disabled={!valid || send.isPending} onClick={() => send.mutate()}>
          <Send className="mr-2 size-4" /> Publish question
        </Button>
      </div>
    </div>
  );
}

function AiEntry() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const format = useServerFn(formatQuestionsWithAI);

  const [defaultSubject, setDefaultSubject] = useState<string>(PRACTICE_SUBJECTS[0]);
  const [tag, setTag] = useState<string>("Untagged");
  const [raw, setRaw] = useState("");
  const [drafts, setDrafts] = useState<AiDraftQuestion[]>([]);

  const parse = useMutation({
    mutationFn: async () => {
      const res = await format({ data: { rawText: raw, defaultSubject } });
      return res.questions;
    },
    onSuccess: (questions) => {
      setDrafts(questions);
      toast.success(`Parsed ${questions.length} question${questions.length === 1 ? "" : "s"}`);
    },
    onError: (e: Error) => toast.error(e.message || "AI could not parse that"),
  });

  const publish = useMutation({
    mutationFn: () =>
      submitQuestions(
        drafts.map((d) => ({
          subject: d.subject,
          qtype: d.qtype,
          difficulty: d.difficulty,
          tag,
          question: d.question,
          options: d.options,
          correct_index: d.correct_index,
          explanation: d.explanation,
          author_name: profile.data?.display_name ?? null,
        })),
      ),
    onSuccess: (n) => {
      setDrafts([]);
      setRaw("");
      toast.success(`Published ${n} question${n === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["practice-mine"] });
      qc.invalidateQueries({ queryKey: ["practice-approved"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not publish"),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Default subject (used if unclear)</Label>
          <PickerSelect value={defaultSubject} onChange={setDefaultSubject} options={PRACTICE_SUBJECTS} />
        </div>
        <div className="grid gap-2">
          <Label>Tag for all submitted questions</Label>
          <PickerSelect value={tag} onChange={setTag} options={PRACTICE_TAGS} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-4 text-sm">
        <p className="font-semibold">How it works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Paste your raw question(s) — text, options and answer in any format.</li>
          <li>AI formats them into subject, type, difficulty, options and explanation.</li>
          <li>Review the preview, then publish them to the arena.</li>
        </ol>
      </div>

      <Textarea
        rows={7}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={`Paste raw questions here, e.g.\n\nWhich normal form removes transitive dependency?\nA) 1NF B) 2NF C) 3NF D) BCNF\nAnswer: C`}
      />

      <Button disabled={raw.trim().length < 10 || parse.isPending} onClick={() => parse.mutate()}>
        <Sparkles className="mr-2 size-4" />
        {parse.isPending ? "Formatting with AI…" : "Format with AI"}
      </Button>

      {drafts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Preview ({drafts.length})</p>
          {drafts.map((d, i) => (
            <div key={i} className="rounded-xl border border-border bg-background p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">{d.subject}</Badge>
                <Badge variant="outline">{d.qtype}</Badge>
                <Badge variant="outline">{d.difficulty}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setDrafts((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="mt-2 font-semibold">{d.question}</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {d.options.map((o, j) => (
                  <li key={j} className={j === d.correct_index ? "font-semibold text-primary" : ""}>
                    {LETTERS[j]}. {o}
                  </li>
                ))}
              </ul>
              {d.explanation && <p className="mt-2 text-xs text-muted-foreground">{d.explanation}</p>}
            </div>
          ))}
          <Button className="w-full" disabled={publish.isPending} onClick={() => publish.mutate()}>
            <Send className="mr-2 size-4" /> Publish {drafts.length} question
            {drafts.length === 1 ? "" : "s"} to the arena
          </Button>
        </div>
      )}
    </div>
  );
}

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
