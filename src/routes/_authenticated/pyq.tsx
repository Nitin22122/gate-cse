import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useRef } from "react";
import {
  CheckCircle2,
  Layers,
  ListFilter,
  SkipForward,
  Trash2,
  Upload,
  XCircle,
  ImagePlus,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
const QUESTION_TYPES = ["MCQ", "MSQ", "NAT"] as const;
const MARKS_OPTIONS = [1, 2] as const;

type QuestionType = typeof QUESTION_TYPES[number];
type Marks = typeof MARKS_OPTIONS[number];

interface ExtendedPyqQuestion extends PyqQuestion {
  qtype: QuestionType;
  marks: Marks;
  image?: string; // Base64 or URL
  msq_correct_indices?: number[]; // For MSQ questions
}

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

function useFilters(list: ExtendedPyqQuestion[]) {
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
      <Picker value={qtype} onChange={setQtype} label="All Types" options={QUESTION_TYPES} />
      <Picker value={marks} onChange={setMarks} label="All Marks" options={MARKS_OPTIONS.map(String)} />
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
  const { filtered, controls } = useFilters((questions.data ?? []) as ExtendedPyqQuestion[]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [msqSelected, setMsqSelected] = useState<number[]>([]);
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

  const q = filtered[Math.min(index, Math.max(filtered.length - 1, 0))] as ExtendedPyqQuestion;
  const isNat = !!q && q.qtype === "NAT";
  const isMsq = !!q && q.qtype === "MSQ";

  function reset() {
    setSelected(null);
    setMsqSelected([]);
    setNatValue("");
    setRevealed(false);
  }

  function next() {
    reset();
    setIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
  }

  function toggleMsqOption(idx: number) {
    setMsqSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }

  function submit() {
    if (!q) return;
    
    let correct = false;
    let selectedIndices: number[] | null = null;

    if (isNat) {
      correct = natValue.trim() !== "" &&
        natValue.trim().toLowerCase() === (q.answer_text ?? "").trim().toLowerCase();
    } else if (isMsq) {
      const correctIndices = (q as ExtendedPyqQuestion).msq_correct_indices || [];
      selectedIndices = msqSelected.sort();
      correct = correctIndices.length === msqSelected.length &&
        correctIndices.every((v, i) => v === msqSelected[i]);
    } else {
      correct = selected === q.correct_index;
      selectedIndices = selected !== null ? [selected] : null;
    }

    setRevealed(true);
    save.mutate({
      question_id: q.id,
      selected_index: isNat ? null : (isMsq ? null : selected),
      selected_indices: isMsq ? msqSelected : null,
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
        selected_indices: null,
        answer_text: null,
        is_correct: false,
        skipped: true,
      });
    next();
  }

  function getTypeColor(type: string) {
    switch (type) {
      case "MCQ": return "bg-blue-500";
      case "MSQ": return "bg-purple-500";
      case "NAT": return "bg-green-500";
      default: return "bg-gray-500";
    }
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
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="text-primary">GATE {q.year}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{q.subject}</span>
            <Badge variant="outline">{q.topic}</Badge>
            <Badge className={getTypeColor(q.qtype)}>{q.qtype}</Badge>
            <Badge variant="outline">{q.marks} Mark{q.marks === 1 ? "" : "s"}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {index + 1} / {filtered.length}
            </span>
          </div>

          {/* Image Display */}
          {(q as ExtendedPyqQuestion).image && (
            <div className="mt-4 rounded-lg border border-border p-2">
              <img 
                src={(q as ExtendedPyqQuestion).image} 
                alt="Question" 
                className="max-h-64 rounded object-contain"
              />
            </div>
          )}

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
          ) : isMsq ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {q.options.map((opt, i) => {
                const isSelected = msqSelected.includes(i);
                const isCorrect = revealed && (q as ExtendedPyqQuestion).msq_correct_indices?.includes(i);
                const isWrong = revealed && isSelected && !(q as ExtendedPyqQuestion).msq_correct_indices?.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => !revealed && toggleMsqOption(i)}
                    className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                      isCorrect
                        ? "border-primary bg-primary/10"
                        : isWrong
                          ? "border-destructive bg-destructive/10"
                          : isSelected
                            ? "border-primary bg-accent"
                            : "border-border hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        disabled={revealed}
                        className="pointer-events-none"
                      />
                      <span className="font-bold text-primary">{LETTERS[i]}.</span>
                      <span>{opt}</span>
                    </div>
                  </button>
                );
              })}
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
                {(() => {
                  let isCorrect = false;
                  if (isNat) {
                    isCorrect = natValue.trim().toLowerCase() === (q.answer_text ?? "").trim().toLowerCase();
                  } else if (isMsq) {
                    const correctIndices = (q as ExtendedPyqQuestion).msq_correct_indices || [];
                    isCorrect = correctIndices.length === msqSelected.length &&
                      correctIndices.every((v, i) => v === msqSelected[i]);
                  } else {
                    isCorrect = selected === q.correct_index;
                  }
                  return isCorrect ? (
                    <>
                      <CheckCircle2 className="size-4 text-primary" /> Correct! ✅
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" /> Correct answer:{" "}
                      {isNat ? (q.answer_text ?? "—") : 
                       isMsq ? (q as ExtendedPyqQuestion).msq_correct_indices?.map(i => LETTERS[i]).join(", ") || "—" :
                       LETTERS[q.correct_index]}
                    </>
                  );
                })()}
              </p>
              {q.explanation && <p className="mt-2 text-muted-foreground">{q.explanation}</p>}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {!revealed ? (
              <Button 
                onClick={submit} 
                disabled={
                  isNat ? !natValue.trim() : 
                  isMsq ? msqSelected.length === 0 : 
                  selected === null
                }
              >
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
  const { filtered, controls } = useFilters((questions.data ?? []) as ExtendedPyqQuestion[]);

  const groups = useMemo(() => {
    const map = new Map<string, ExtendedPyqQuestion[]>();
    for (const q of filtered) {
      const key = `${q.subject} › ${q.topic}`;
      map.set(key, [...(map.get(key) ?? []), q]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function getTypeColor(type: string) {
    switch (type) {
      case "MCQ": return "bg-blue-500";
      case "MSQ": return "bg-purple-500";
      case "NAT": return "bg-green-500";
      default: return "bg-gray-500";
    }
  }

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
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">GATE {q.year}</span>
                    <Badge className={getTypeColor(q.qtype)}>{q.qtype}</Badge>
                    <Badge variant="outline">{q.marks}M</Badge>
                  </div>
                  <span className="mt-1 block text-muted-foreground">{q.question}</span>
                  {(q as ExtendedPyqQuestion).image && (
                    <ImageIcon className="mt-1 size-4 text-muted-foreground" />
                  )}
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
  const [qtype, setQtype] = useState<QuestionType>("MCQ");
  const [marks, setMarks] = useState<Marks>(1);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [correct, setCorrect] = useState("1");
  const [msqCorrect, setMsqCorrect] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [bulk, setBulk] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const options = optionsText
    .split(";;")
    .map((o) => o.trim())
    .filter(Boolean);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addOne = useMutation({
    mutationFn: () => {
      const msqCorrectIndices = qtype === "MSQ" 
        ? msqCorrect.split(",").map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n) && n >= 0 && n < options.length)
        : undefined;

      return addPyqQuestions([
        {
          year: Number(year),
          paper,
          subject,
          topic: topic.trim() || "Untagged",
          qtype,
          marks,
          question: question.trim(),
          options,
          correct_index: qtype === "MCQ" ? Math.max(0, Math.min(options.length - 1, Number(correct) - 1)) : 0,
          msq_correct_indices: msqCorrectIndices,
          answer_text: qtype === "NAT" ? answerText.trim() || null : null,
          explanation: explanation.trim() || null,
          image: image || undefined,
        } as any,
      ]);
    },
    onSuccess: () => {
      setQuestion("");
      setOptionsText("");
      setAnswerText("");
      setExplanation("");
      setImage(null);
      setImagePreview(null);
      toast.success("Question added successfully!");
      qc.invalidateQueries({ queryKey: ["pyq-all"] });
      qc.invalidateQueries({ queryKey: ["pyq-mine"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add question"),
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

  const isFormValid = question.trim().length >= 5 && topic.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-extrabold text-primary">Add a PYQ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details below to add a new PYQ question.
        </p>

        {/* Basic Info */}
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

        {/* Question Type & Marks */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SimpleSelect 
            value={qtype} 
            onChange={(v) => setQtype(v as QuestionType)} 
            options={QUESTION_TYPES} 
          />
          <SimpleSelect 
            value={String(marks)} 
            onChange={(v) => setMarks(Number(v) as Marks)} 
            options={MARKS_OPTIONS.map(String)} 
          />
        </div>

        {/* Image Upload */}
        <div className="mt-4">
          <Label>Image (optional)</Label>
          <div className="mt-2 flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            {imagePreview && (
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
                <button
                  onClick={removeImage}
                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white hover:bg-destructive/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Question Text */}
        <div className="mt-4">
          <Textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Question text..."
          />
        </div>

        {/* Options */}
        <div className="mt-4">
          <Textarea
            rows={3}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="Options separated by ;; (leave blank for NAT)"
          />
          {options.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {options.length} option{options.length === 1 ? "" : "s"} detected
            </div>
          )}
        </div>

        {/* Correct Answer */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {qtype === "MCQ" && options.length > 0 && (
            <div>
              <Label htmlFor="mcq-correct">Correct option number</Label>
              <Input
                id="mcq-correct"
                type="number"
                min={1}
                max={Math.max(options.length, 1)}
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
              />
            </div>
          )}
          {qtype === "MSQ" && options.length > 0 && (
            <div>
              <Label htmlFor="msq-correct">Correct option numbers (comma separated)</Label>
              <Input
                id="msq-correct"
                value={msqCorrect}
                onChange={(e) => setMsqCorrect(e.target.value)}
                placeholder="e.g. 1,3,4"
              />
            </div>
          )}
          {qtype === "NAT" && (
            <div>
              <Label htmlFor="nat-answer">Numeric answer</Label>
              <Input
                id="nat-answer"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="e.g. 12.5"
              />
            </div>
          )}
        </div>

        {/* Explanation */}
        <div className="mt-4">
          <Textarea
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explanation (optional)"
          />
        </div>

        <Button
          className="mt-4 w-full"
          disabled={!isFormValid || addOne.isPending}
          onClick={() => addOne.mutate()}
        >
          Add question
        </Button>
      </div>

      {/* Bulk Import */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Bulk import</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste one question per line as:
          <br />
          <code className="text-xs">
            year | subject | topic | qtype | marks | question | optA ;; optB ;; optC ;; optD | correctNumber | explanation
          </code>
        </p>
        <Textarea
          className="mt-3 font-mono text-xs"
          rows={8}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={`2015 | Algorithms | Sorting | MCQ | 1 | Worst case of quicksort? | O(n) ;; O(n log n) ;; O(n^2) ;; O(1) | 3 | Pivot always smallest/largest`}
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

  function getTypeColor(type: string) {
    switch (type) {
      case "MCQ": return "bg-blue-500";
      case "MSQ": return "bg-purple-500";
      case "NAT": return "bg-green-500";
      default: return "bg-gray-500";
    }
  }

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
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{q.question}</p>
                {(q as ExtendedPyqQuestion).image && (
                  <ImageIcon className="size-4 text-muted-foreground" />
                )}
              </div>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>GATE {q.year}</span>
                <span>•</span>
                <span>{q.subject}</span>
                <span>•</span>
                <span>{q.topic}</span>
                <Badge className={getTypeColor(q.qtype)}>{q.qtype}</Badge>
                <Badge variant="outline">{q.marks}M</Badge>
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