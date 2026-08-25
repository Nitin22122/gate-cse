import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Layers,
  ListFilter,
  SkipForward,
  Trash2,
  Upload,
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
  PRACTICE_SUBJECTS,
  PYQ_PAPERS,
  PYQ_YEARS,
  addPyqQuestions,
  deletePyqQuestion,
  fetchMyPyqAttempts,
  fetchMyPyqQuestions,
  fetchPyqQuestions,
  parsePyqBulk,
  recordPyqAttempt,
  type PyqQuestion,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/pyq")({
  head: () => ({
    meta: [
      { title: "PYQ Arena — GATE CSE 2000–2026" },
      {
        name: "description",
        content:
          "Browse and solve GATE CSE previous year questions from 2000 to 2026, filtered by year, subject and topic.",
      },
      { property: "og:title", content: "PYQ Arena — GATE CSE 2000–2026" },
      {
        property: "og:description",
        content: "Year, subject and topic wise GATE CSE previous year question practice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PyqPage,
});

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function PyqPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">PYQ Arena</h1>
        <p className="text-sm text-muted-foreground">
          GATE CSE previous year questions, 2000–2026 — year, subject and topic wise.
        </p>
      </div>

      <Tabs defaultValue="solve" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="solve">
            <ListFilter className="mr-2 size-4" /> Solve
          </TabsTrigger>
          <TabsTrigger value="browse">
            <Layers className="mr-2 size-4" /> Browse
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="mr-2 size-4" /> Add / Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="solve">
          <Solve />
        </TabsContent>
        <TabsContent value="browse">
          <Browse />
        </TabsContent>
        <TabsContent value="import" className="space-y-6">
          <ImportPanel />
          <MyPyqs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useFilters(list: PyqQuestion[]) {
  const [year, setYear] = useState("all");
  const [subject, setSubject] = useState("all");
  const [topic, setTopic] = useState("all");

  const topics = useMemo(() => {
    const set = new Set(
      list
        .filter((q) => subject === "all" || q.subject === subject)
        .map((q) => q.topic)
        .filter(Boolean),
    );
    return [...set].sort();
  }, [list, subject]);

  const filtered = useMemo(
    () =>
      list.filter(
        (q) =>
          (year === "all" || String(q.year) === year) &&
          (subject === "all" || q.subject === subject) &&
          (topic === "all" || q.topic === topic),
      ),
    [list, year, subject, topic],
  );

  const controls = (
    <div className="flex flex-wrap items-center gap-3">
      <Picker value={year} onChange={setYear} label="All Years" options={PYQ_YEARS.map(String)} />
      <Picker
        value={subject}
        onChange={(v) => {
          setSubject(v);
          setTopic("all");
        }}
        label="All Subjects"
        options={PRACTICE_SUBJECTS}
      />
      <Picker value={topic} onChange={setTopic} label="All Topics" options={topics} />
    </div>
  );

  return { filtered, controls };
}

function Picker({
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

function Solve() {
  const qc = useQueryClient();
  const questions = useQuery({ queryKey: ["pyq-all"], queryFn: fetchPyqQuestions });
  const attempts = useQuery({ queryKey: ["pyq-attempts"], queryFn: fetchMyPyqAttempts });
  const { filtered, controls } = useFilters(questions.data ?? []);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [natValue, setNatValue] = useState("");
  const [revealed, setRevealed] = useState(false);

  const stats = useMemo(() => {
    const rows = attempts.data ?? [];
    const solved = rows.filter((a) => a.is_correct).length;
    const tried = rows.filter((a) => !a.skipped).length;
    return { solved, tried, pct: tried ? Math.round((solved / tried) * 100) : 0 };
  }, [attempts.data]);

  const save = useMutation({
    mutationFn: recordPyqAttempt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pyq-attempts"] }),
  });

  const q = filtered[Math.min(index, Math.max(filtered.length - 1, 0))];
  const isNat = !!q && q.options.length === 0;

  function reset() {
    setSelected(null);
    setNatValue("");
    setRevealed(false);
  }

  function next() {
    reset();
    setIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
  }

  function submit() {
    if (!q) return;
    const correct = isNat
      ? natValue.trim() !== "" &&
        natValue.trim().toLowerCase() === (q.answer_text ?? "").trim().toLowerCase()
      : selected === q.correct_index;
    setRevealed(true);
    save.mutate({
      question_id: q.id,
      selected_index: isNat ? null : selected,
      answer_text: isNat ? natValue.trim() : null,
      is_correct: correct,
      skipped: false,
    });
  }

  function skip() {
    if (q)
      save.mutate({
        question_id: q.id,
        selected_index: null,
        answer_text: null,
        is_correct: false,
        skipped: true,
      });
    next();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {controls}
        <div className="ml-auto rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold">
          Score: {stats.solved} / {stats.tried} ({stats.pct}%)
        </div>
      </div>

      {questions.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading PYQs…</p>
      ) : !q ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No PYQs match these filters yet. Add or import them from the “Add / Import” tab.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
            <span>GATE {q.year}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{q.subject}</span>
            <Badge variant="outline">{q.topic}</Badge>
            <Badge variant="secondary">{q.qtype}</Badge>
            <Badge variant="outline">{q.marks} mark{q.marks === 1 ? "" : "s"}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {index + 1} / {filtered.length}
            </span>
          </div>

          <p className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-relaxed">
            {q.question}
          </p>

          {isNat ? (
            <div className="mt-5 grid gap-2 sm:max-w-xs">
              <Label htmlFor="nat">Your answer</Label>
              <Input
                id="nat"
                value={natValue}
                onChange={(e) => setNatValue(e.target.value)}
                disabled={revealed}
                placeholder="Numerical answer"
              />
            </div>
          ) : (
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
          )}

          {revealed && (
            <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                {(isNat
                  ? natValue.trim().toLowerCase() === (q.answer_text ?? "").trim().toLowerCase()
                  : selected === q.correct_index) ? (
                  <>
                    <CheckCircle2 className="size-4 text-primary" /> Correct!
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-destructive" /> Correct answer:{" "}
                    {isNat ? (q.answer_text ?? "—") : LETTERS[q.correct_index]}
                  </>
                )}
              </p>
              {q.explanation && <p className="mt-2 text-muted-foreground">{q.explanation}</p>}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {!revealed ? (
              <Button onClick={submit} disabled={isNat ? !natValue.trim() : selected === null}>
                Submit answer
              </Button>
            ) : (
              <Button onClick={next}>Next question</Button>
            )}
            <Button variant="secondary" onClick={skip}>
              <SkipForward className="mr-2 size-4" /> Skip
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Browse() {
  const questions = useQuery({ queryKey: ["pyq-all"], queryFn: fetchPyqQuestions });
  const { filtered, controls } = useFilters(questions.data ?? []);

  const groups = useMemo(() => {
    const map = new Map<string, PyqQuestion[]>();
    for (const q of filtered) {
      const key = `${q.subject} › ${q.topic}`;
      map.set(key, [...(map.get(key) ?? []), q]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="space-y-5">
      {controls}
      <p className="text-sm text-muted-foreground">
        {filtered.length} question{filtered.length === 1 ? "" : "s"} across {groups.length} topic
        {groups.length === 1 ? "" : "s"}
      </p>

      {groups.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Nothing here yet — import your PYQ set to get started.
        </div>
      )}

      <div className="space-y-4">
        {groups.map(([key, rows]) => (
          <div key={key} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">{key}</h2>
              <Badge variant="secondary">{rows.length}</Badge>
            </div>
            <ul className="mt-3 space-y-2">
              {rows.map((q) => (
                <li
                  key={q.id}
                  className="rounded-xl border border-border bg-background p-3 text-sm"
                >
                  <span className="mr-2 font-semibold text-primary">GATE {q.year}</span>
                  <span className="text-muted-foreground">{q.question}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportPanel() {
  const qc = useQueryClient();
  const [year, setYear] = useState(String(PYQ_YEARS[0]));
  const [paper, setPaper] = useState<string>(PYQ_PAPERS[0]);
  const [subject, setSubject] = useState<string>(PRACTICE_SUBJECTS[0]!);
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correct, setCorrect] = useState("1");
  const [answerText, setAnswerText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [bulk, setBulk] = useState("");

  const options = optionsText
    .split(";;")
    .map((o) => o.trim())
    .filter(Boolean);

  const addOne = useMutation({
    mutationFn: () =>
      addPyqQuestions([
        {
          year: Number(year),
          paper,
          subject,
          topic: topic.trim() || "Untagged",
          qtype: options.length ? "MCQ" : "NAT",
          marks: 1,
          question: question.trim(),
          options,
          correct_index: Math.max(0, Math.min(options.length - 1, Number(correct) - 1)),
          answer_text: options.length ? null : answerText.trim() || null,
          explanation: explanation.trim() || null,
        },
      ]),
    onSuccess: () => {
      setQuestion("");
      setOptionsText("");
      setAnswerText("");
      setExplanation("");
      toast.success("Question added");
      qc.invalidateQueries({ queryKey: ["pyq-all"] });
      qc.invalidateQueries({ queryKey: ["pyq-mine"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importBulk = useMutation({
    mutationFn: async () => {
      const rows = parsePyqBulk(bulk, paper);
      if (!rows.length) throw new Error("Nothing to import");
      await addPyqQuestions(rows);
      return rows.length;
    },
    onSuccess: (n) => {
      setBulk("");
      toast.success(`Imported ${n} question${n === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["pyq-all"] });
      qc.invalidateQueries({ queryKey: ["pyq-mine"] });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-extrabold text-primary">Add a PYQ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Leave options empty for a NAT question and fill the numeric answer instead.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <SimpleSelect value={year} onChange={setYear} options={PYQ_YEARS.map(String)} />
          <SimpleSelect value={paper} onChange={setPaper} options={PYQ_PAPERS} />
          <SimpleSelect value={subject} onChange={setSubject} options={PRACTICE_SUBJECTS} />
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (e.g. Normalization)"
          />
        </div>

        <div className="mt-4 space-y-3">
          <Textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Question text..."
          />
          <Textarea
            rows={3}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="Options separated by ;; (leave blank for NAT)"
          />
          {options.length ? (
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="pyq-correct">Correct option number</Label>
              <Input
                id="pyq-correct"
                type="number"
                min={1}
                max={Math.max(options.length, 1)}
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="pyq-answer">Numeric answer</Label>
              <Input
                id="pyq-answer"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="e.g. 12.5"
              />
            </div>
          )}
          <Textarea
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explanation (optional)"
          />
          <Button
            className="w-full"
            disabled={question.trim().length < 5 || addOne.isPending}
            onClick={() => addOne.mutate()}
          >
            Add question
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Bulk import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a JSON array, or one question per line as:
          <br />
          <code className="text-xs">
            year | subject | topic | question | optA ;; optB ;; optC ;; optD | correctNumber |
            explanation
          </code>
        </p>
        <Textarea
          className="mt-3 font-mono text-xs"
          rows={8}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={`2015 | Algorithms | Sorting | Worst case of quicksort? | O(n) ;; O(n log n) ;; O(n^2) ;; O(1) | 3 | Pivot always smallest/largest`}
        />
        <Button
          className="mt-3"
          disabled={!bulk.trim() || importBulk.isPending}
          onClick={() => importBulk.mutate()}
        >
          <Upload className="mr-2 size-4" /> Import
        </Button>
      </div>
    </div>
  );
}

function SimpleSelect({
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

function MyPyqs() {
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ["pyq-mine"], queryFn: fetchMyPyqQuestions });
  const remove = useMutation({
    mutationFn: deletePyqQuestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pyq-mine"] });
      qc.invalidateQueries({ queryKey: ["pyq-all"] });
    },
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold">Your PYQ uploads</h2>
      <div className="mt-4 space-y-3">
        {(mine.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>
        )}
        {(mine.data ?? []).map((q) => (
          <div
            key={q.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-background p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{q.question}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                GATE {q.year} • {q.subject} • {q.topic} • {q.qtype}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => remove.mutate(q.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
