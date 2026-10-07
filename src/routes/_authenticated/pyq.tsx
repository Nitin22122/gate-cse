import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ImagePlus,
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
  PYQ_MARKS,
  PYQ_PAPERS,
  PYQ_TYPES,
  PYQ_YEARS,
  addPyqQuestions,
  checkNatAnswer,
  latestPyqResults,
  deletePyqQuestion,
  fetchMyPyqAttempts,
  fetchMyPyqQuestions,
  fetchPyqQuestions,
  parsePyqBulk,
  pyqImageUrl,
  recordPyqAttempt,
  uploadPyqImage,
  type PyqQuestion,
} from "@/lib/data";
import { PyqPdfImporter } from "@/components/PyqPdfImporter";

export const Route = createFileRoute("/_authenticated/pyq")({
  head: () => ({
    meta: [
      { title: "PYQ Arena — GATE CSE 2000–2026" },
      {
        name: "description",
        content:
          "Browse and solve GATE CSE previous year questions from 2000 to 2026 — MCQ, MSQ and NAT, 1 and 2 mark, with images.",
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
          GATE CSE previous year questions, 2000–2026 — MCQ, MSQ and NAT, 1 &amp; 2 mark, with
          image support.
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
          <PyqPdfImporter />
          <ImportPanel />
          <MyPyqs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuestionImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    pyqImageUrl(path)
      .then((u) => active && setUrl(u))
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [path]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Question diagram"
      loading="lazy"
      className="mt-4 max-h-96 w-auto rounded-xl border border-border bg-background"
    />
  );
}

function useFilters(list: PyqQuestion[]) {
  const [year, setYear] = useState("all");
  const [subject, setSubject] = useState("all");
  const [topic, setTopic] = useState("all");
  const [qtype, setQtype] = useState("all");
  const [marks, setMarks] = useState("all");

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
          (topic === "all" || q.topic === topic) &&
          (qtype === "all" || q.qtype === qtype) &&
          (marks === "all" || String(q.marks) === marks),
      ),
    [list, year, subject, topic, qtype, marks],
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
      <Picker value={qtype} onChange={setQtype} label="All Types" options={PYQ_TYPES} />
      <Picker
        value={marks}
        onChange={setMarks}
        label="All Marks"
        options={PYQ_MARKS.map((m) => String(m))}
      />
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
      <SelectTrigger className="w-40">
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

function sameSet(a: number[], b: number[]) {
  const x = [...new Set(a)].sort((m, n) => m - n);
  const y = [...new Set(b)].sort((m, n) => m - n);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function Solve() {
  const qc = useQueryClient();
  const questions = useQuery({ queryKey: ["pyq-all"], queryFn: fetchPyqQuestions });
  const attempts = useQuery({ queryKey: ["pyq-attempts"], queryFn: fetchMyPyqAttempts });
  const { filtered, controls } = useFilters(questions.data ?? []);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [multi, setMulti] = useState<number[]>([]);
  const [natValue, setNatValue] = useState("");
  const [revealed, setRevealed] = useState(false);

  const stats = useMemo(() => {
    const latest = [...latestPyqResults(attempts.data ?? []).values()];
    const solved = latest.filter((a) => a.is_correct).length;
    const tried = latest.length;
    return { solved, tried, pct: tried ? Math.round((solved / tried) * 100) : 0 };
  }, [attempts.data]);

  const save = useMutation({
    mutationFn: recordPyqAttempt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pyq-attempts"] }),
  });

  const q = filtered[Math.min(index, Math.max(filtered.length - 1, 0))];
  const isNat = !!q && (q.qtype === "NAT" || q.options.length === 0);
  const isMsq = !!q && q.qtype === "MSQ" && q.options.length > 0;
  const answerKey = useMemo(() => {
    if (!q) return [] as number[];
    return q.correct_indices?.length ? q.correct_indices : [q.correct_index];
  }, [q]);

  const isCorrect = () => {
    if (!q) return false;
    if (isNat)
      return natValue.trim() !== "" && checkNatAnswer(natValue, q.answer_text);
    if (isMsq) return multi.length > 0 && sameSet(multi, answerKey);
    return selected === q.correct_index;
  };

  function reset() {
    setSelected(null);
    setMulti([]);
    setNatValue("");
    setRevealed(false);
  }

  function next() {
    reset();
    setIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
  }

  function submit() {
    if (!q) return;
    const correct = isCorrect();
    setRevealed(true);
    save.mutate({
      question_id: q.id,
      selected_index: isNat ? null : isMsq ? null : selected,
      selected_indices: isMsq ? multi : [],
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
        selected_indices: [],
        answer_text: null,
        is_correct: false,
        skipped: true,
      });
    next();
  }

  const canSubmit = isNat ? !!natValue.trim() : isMsq ? multi.length > 0 : selected !== null;

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
            <Badge variant="outline">
              {q.marks} mark{q.marks === 1 ? "" : "s"}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {index + 1} / {filtered.length}
            </span>
          </div>

          <p className="mt-5 whitespace-pre-wrap text-lg font-semibold leading-relaxed">
            {q.question}
          </p>

          {q.image_path && <QuestionImage path={q.image_path} />}

          {isMsq && !revealed && (
            <p className="mt-4 text-xs font-semibold text-muted-foreground">
              Multiple Select — choose all correct options.
            </p>
          )}

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
                const chosen = isMsq ? multi.includes(i) : selected === i;
                const correct = revealed && answerKey.includes(i);
                const wrong = revealed && chosen && !answerKey.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (revealed) return;
                      if (isMsq)
                        setMulti((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]));
                      else setSelected(i);
                    }}
                    className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                      correct
                        ? "border-primary bg-primary/10"
                        : wrong
                          ? "border-destructive bg-destructive/10"
                          : chosen
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
                {isCorrect() ? (
                  <>
                    <CheckCircle2 className="size-4 text-primary" /> Correct!
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-destructive" /> Correct answer:{" "}
                    {isNat
                      ? (q.answer_text ?? "—")
                      : answerKey.map((i) => LETTERS[i]).join(", ")}
                  </>
                )}
              </p>
              {q.explanation && <p className="mt-2 text-muted-foreground">{q.explanation}</p>}
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
                  <Badge variant="secondary" className="mr-2">
                    {q.qtype}
                  </Badge>
                  <Badge variant="outline" className="mr-2">
                    {q.marks}M
                  </Badge>
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
  const [qtype, setQtype] = useState<string>("MCQ");
  const [marks, setMarks] = useState("1");
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correct, setCorrect] = useState("1");
  const [answerText, setAnswerText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bulk, setBulk] = useState("");

  const options = optionsText
    .split(";;")
    .map((o) => o.trim())
    .filter(Boolean);

  const isNat = qtype === "NAT";
  const isMsq = qtype === "MSQ";

  const correctNumbers = correct
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= options.length);

  const addOne = useMutation({
    mutationFn: async () => {
      const image_path = imageFile ? await uploadPyqImage(imageFile) : null;
      const indices = correctNumbers.map((n) => n - 1);
      return addPyqQuestions([
        {
          year: Number(year),
          paper,
          subject,
          topic: topic.trim() || "Untagged",
          qtype,
          marks: Number(marks) === 2 ? 2 : 1,
          question: question.trim(),
          options: isNat ? [] : options,
          correct_index: indices[0] ?? 0,
          correct_indices: isMsq ? indices : [],
          image_path,
          answer_text: isNat ? answerText.trim() || null : null,
          explanation: explanation.trim() || null,
        },
      ]);
    },
    onSuccess: (res) => {
      if (!res.added) {
        toast.error("This question is already in the bank — skipped.");
        return;
      }
      setQuestion("");
      setOptionsText("");
      setAnswerText("");
      setExplanation("");
      setImageFile(null);
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
      return addPyqQuestions(rows);
    },
    onSuccess: ({ added, skipped }) => {
      setBulk("");
      toast.success(
        `Imported ${added} question${added === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : ""}`,
      );
      qc.invalidateQueries({ queryKey: ["pyq-all"] });
      qc.invalidateQueries({ queryKey: ["pyq-mine"] });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });

  const invalid =
    question.trim().length < 5 ||
    (isNat ? !answerText.trim() : options.length < 2 || correctNumbers.length === 0) ||
    (isMsq && correctNumbers.length < 2);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-extrabold text-primary">Add a PYQ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the pattern — MCQ (one answer), MSQ (multiple answers) or NAT (numeric) — set 1 or 2
          marks, and attach an image if the question has a diagram.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SimpleSelect value={year} onChange={setYear} options={PYQ_YEARS.map(String)} />
          <SimpleSelect value={paper} onChange={setPaper} options={PYQ_PAPERS} />
          <SimpleSelect value={subject} onChange={setSubject} options={PRACTICE_SUBJECTS} />
          <SimpleSelect value={qtype} onChange={setQtype} options={PYQ_TYPES} />
          <SimpleSelect
            value={marks}
            onChange={setMarks}
            options={PYQ_MARKS.map((m) => String(m))}
          />
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

          <div className="grid gap-2">
            <Label htmlFor="pyq-image" className="flex items-center gap-2">
              <ImagePlus className="size-4" /> Question image (optional)
            </Label>
            <Input
              id="pyq-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            {imageFile && (
              <p className="text-xs text-muted-foreground">Attached: {imageFile.name}</p>
            )}
          </div>

          {!isNat && (
            <Textarea
              rows={3}
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Options separated by ;;"
            />
          )}

          {isNat ? (
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="pyq-answer">Numeric answer</Label>
              <Input
                id="pyq-answer"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="e.g. 12.5 or 4.0 to 4.2"
              />
            </div>
          ) : (
            <div className="grid gap-2 sm:max-w-xs">
              <Label htmlFor="pyq-correct">
                {isMsq ? "Correct option numbers (e.g. 1,3)" : "Correct option number"}
              </Label>
              <Input
                id="pyq-correct"
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
                placeholder={isMsq ? "1,3" : "1"}
              />
            </div>
          )}

          <Textarea
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explanation (optional)"
          />
          <Button className="w-full" disabled={invalid || addOne.isPending} onClick={() => addOne.mutate()}>
            {addOne.isPending ? "Adding…" : "Add question"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Bulk import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Correct answers are always 1-based (1 = A). Paste a JSON array (fields: year, paper,
          subject, topic, qtype, marks, question, options, correct e.g. 3 or [2,4], answer for NAT
          e.g. "4.0 to 4.2", explanation), or one question per line as:
          <br />
          <code className="text-xs">
            year | subject | topic | question | optA ;; optB ;; optC ;; optD | correct (3, or 2,4
            for MSQ) | explanation | marks
          </code>
        </p>
        <Textarea
          className="mt-3 font-mono text-xs"
          rows={8}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={`2015 | Algorithms | Sorting | Worst case of quicksort? | O(n) ;; O(n log n) ;; O(n^2) ;; O(1) | 3 | Pivot always smallest/largest | 1`}
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
                GATE {q.year} • {q.subject} • {q.topic} • {q.qtype} • {q.marks} mark
                {q.marks === 1 ? "" : "s"}
                {q.image_path ? " • image" : ""}
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
