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
  const [subject, setSubject] = useState<string>(PRACTICE_SUBJECTS[0]);
  const [qtype, setQtype] = useState<string>(PRACTICE_TYPES[0]);
  const [difficulty, setDifficulty] = useState<string>("Medium");
  const [tag, setTag] = useState<string>("Untagged");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correct, setCorrect] = useState("1");
  const [explanation, setExplanation] = useState("");

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
      toast.success("Submitted for review");
      qc.invalidateQueries({ queryKey: ["practice-mine"] });
    },
    onError: () => toast.error("Could not submit question"),
  });

  const valid = question.trim().length > 5 && options.length >= 2;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-extrabold text-primary">Contribute a Question!</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Help build the practice database. All questions are reviewed before going live.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
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
        <Button className="w-full" disabled={!valid || send.isPending} onClick={() => send.mutate()}>
          <Send className="mr-2 size-4" /> Submit for Review
        </Button>
      </div>
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
