import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Sparkles, Square, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  PYQ_TYPES,
  PYQ_YEARS,
  addPyqQuestions,
  uploadPyqImage,
  type PyqInput,
} from "@/lib/data";
import { extractPyqFromPages, type PdfDraftQuestion } from "@/lib/pyq-ai.functions";

type Draft = PdfDraftQuestion & { figureBlob: Blob | null; figureUrl: string | null };
type RenderedPage = { page: number; canvas: HTMLCanvasElement; image: string };

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const BATCH = 3; // pages per AI call
const STEP = 2; // overlap one page so questions split across pages are not lost

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

async function renderPdf(file: File, onPage: (n: number, total: number) => void) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: RenderedPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
    pages.push({ page: i, canvas, image: canvas.toDataURL("image/jpeg", 0.75) });
    onPage(i, doc.numPages);
  }
  return pages;
}

async function pdfText(file: File) {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    out += tc.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return out.slice(0, 40000);
}

function cropFigure(pages: RenderedPage[], f: NonNullable<PdfDraftQuestion["figure"]>) {
  const src = pages.find((p) => p.page === f.page);
  if (!src) return Promise.resolve(null);
  const clamp = (v: number) => Math.min(1000, Math.max(0, v));
  const x0 = clamp(Math.min(f.x0, f.x1) - 10);
  const x1 = clamp(Math.max(f.x0, f.x1) + 10);
  const y0 = clamp(Math.min(f.y0, f.y1) - 10);
  const y1 = clamp(Math.max(f.y0, f.y1) + 10);
  const W = src.canvas.width;
  const H = src.canvas.height;
  const sx = (x0 / 1000) * W;
  const sy = (y0 / 1000) * H;
  const sw = ((x1 - x0) / 1000) * W;
  const sh = ((y1 - y0) / 1000) * H;
  if (sw < 20 || sh < 20) return Promise.resolve(null);
  const out = document.createElement("canvas");
  out.width = Math.round(sw);
  out.height = Math.round(sh);
  out.getContext("2d")!.drawImage(src.canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return new Promise<Blob | null>((res) => out.toBlob((b) => res(b), "image/jpeg", 0.9));
}

export function PyqPdfImporter() {
  const qc = useQueryClient();
  const extract = useServerFn(extractPyqFromPages);
  const [year, setYear] = useState(String(PYQ_YEARS[0]));
  const [paper, setPaper] = useState<string>("CS-2");
  const [file, setFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const stopRef = useRef(false);

  async function run() {
    if (!file) return;
    stopRef.current = false;
    setRunning(true);
    setDrafts([]);
    try {
      setStatus("Reading PDF pages…");
      const pages = await renderPdf(file, (n, t) => {
        setStatus(`Reading page ${n} of ${t}…`);
        setProgress(Math.round((n / t) * 15));
      });
      const answerKey = keyFile ? await pdfText(keyFile) : null;

      const windows: RenderedPage[][] = [];
      for (let i = 0; i < pages.length; i += STEP) {
        windows.push(pages.slice(i, i + BATCH));
        if (i + BATCH >= pages.length) break;
      }

      const byNumber = new Map<number, Draft>();
      for (let w = 0; w < windows.length; w++) {
        if (stopRef.current) break;
        const win = windows[w]!;
        setStatus(
          `AI reading pages ${win[0]!.page}–${win[win.length - 1]!.page} (batch ${w + 1} of ${windows.length})…`,
        );
        const res = await extract({
          data: {
            pages: win.map((p) => ({ page: p.page, image: p.image })),
            year: Number(year),
            paper,
            answerKey,
          },
        });
        for (const q of res.questions) {
          const prev = byNumber.get(q.question_number);
          if (prev && prev.question.length >= q.question.length) continue;
          const figureBlob = q.figure ? await cropFigure(pages, q.figure) : null;
          if (prev?.figureUrl) URL.revokeObjectURL(prev.figureUrl);
          byNumber.set(q.question_number, {
            ...q,
            figureBlob,
            figureUrl: figureBlob ? URL.createObjectURL(figureBlob) : null,
          });
        }
        setDrafts([...byNumber.values()].sort((a, b) => a.question_number - b.question_number));
        setProgress(15 + Math.round(((w + 1) / windows.length) * 85));
      }
      setStatus(
        stopRef.current
          ? `Stopped. ${byNumber.size} questions extracted so far.`
          : `Done — ${byNumber.size} questions extracted. Review them below, then publish.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      setStatus(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }

  function update(i: number, patch: Partial<Draft>) {
    setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  async function publish() {
    setPublishing(true);
    try {
      const rows: PyqInput[] = [];
      for (const d of drafts) {
        const image_path = d.figureBlob
          ? await uploadPyqImage(d.figureBlob, `${year}-${paper}-q${d.question_number}.jpg`)
          : null;
        const isNat = d.qtype === "NAT" || d.options.length === 0;
        const idx = d.correct.filter((n) => n >= 1 && n <= d.options.length).map((n) => n - 1);
        rows.push({
          year: Number(year),
          paper,
          subject: d.subject,
          topic: d.topic || "Untagged",
          qtype: isNat ? "NAT" : d.qtype,
          marks: d.marks === 2 ? 2 : 1,
          question: d.question,
          options: isNat ? [] : d.options,
          correct_index: idx[0] ?? 0,
          correct_indices: d.qtype === "MSQ" ? idx : [],
          image_path,
          answer_text: isNat ? d.nat_answer : null,
          explanation: d.explanation || null,
        });
      }
      const { added, skipped } = await addPyqQuestions(rows);
      toast.success(`Published ${added} questions${skipped ? `, skipped ${skipped} duplicates` : ""}`);
      drafts.forEach((d) => d.figureUrl && URL.revokeObjectURL(d.figureUrl));
      setDrafts([]);
      setStatus("");
      qc.invalidateQueries({ queryKey: ["pyq-all"] });
      qc.invalidateQueries({ queryKey: ["pyq-mine"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-6">
      <h2 className="flex items-center gap-2 text-xl font-extrabold text-primary">
        <Sparkles className="size-5" /> AI PDF Importer
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a full GATE paper PDF. AI reads every page and pulls out each question, its options,
        type (MCQ/MSQ/NAT), marks, subject, topic, diagrams, the answer and an explanation. Add the
        official answer key PDF for exact answers — otherwise AI solves them (marked “AI answer”).
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <Label>Year</Label>
          <Pick value={year} onChange={setYear} options={PYQ_YEARS.map(String)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Paper / shift</Label>
          <Pick value={paper} onChange={setPaper} options={PYQ_PAPERS} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pdf-q">Question paper PDF</Label>
          <Input
            id="pdf-q"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pdf-k">Answer key PDF (optional)</Label>
          <Input
            id="pdf-k"
            type="file"
            accept="application/pdf"
            onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={!file || running} onClick={run}>
          {running ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
          {running ? "Extracting…" : "Extract questions"}
        </Button>
        {running && (
          <Button variant="secondary" onClick={() => (stopRef.current = true)}>
            <Square className="mr-2 size-4" /> Stop
          </Button>
        )}
      </div>

      {(running || status) && (
        <div className="mt-4 space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold">Review {drafts.length} questions</h3>
            <Button className="ml-auto" disabled={running || publishing} onClick={publish}>
              {publishing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Publish all to PYQ bank
            </Button>
          </div>
          {drafts.map((d, i) => {
            const isNat = d.qtype === "NAT" || d.options.length === 0;
            return (
              <div key={d.question_number} className="rounded-xl border border-border bg-background p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-primary">Q.{d.question_number}</span>
                  <Badge variant={d.answer_source === "key" ? "secondary" : "outline"}>
                    {d.answer_source === "key" ? "Answer key" : "AI answer"}
                  </Badge>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Pick small value={d.subject} onChange={(v) => update(i, { subject: v as Draft["subject"] })} options={PRACTICE_SUBJECTS} />
                    <Pick small value={d.qtype} onChange={(v) => update(i, { qtype: v as Draft["qtype"] })} options={PYQ_TYPES} />
                    <Pick small value={String(d.marks === 2 ? 2 : 1)} onChange={(v) => update(i, { marks: Number(v) })} options={["1", "2"]} />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove question"
                      onClick={() => setDrafts((x) => x.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap font-medium">{d.question}</p>
                {d.figureUrl && (
                  <div className="mt-2 flex items-start gap-2">
                    <img src={d.figureUrl} alt={`Figure for Q.${d.question_number}`} className="max-h-60 rounded-lg border border-border" />
                    <Button size="sm" variant="ghost" onClick={() => update(i, { figureBlob: null, figureUrl: null })}>
                      Remove image
                    </Button>
                  </div>
                )}
                {!isNat && (
                  <ol className="mt-2 grid gap-1 sm:grid-cols-2">
                    {d.options.map((o, k) => (
                      <li key={k} className={d.correct.includes(k + 1) ? "font-semibold text-primary" : "text-muted-foreground"}>
                        {LETTERS[k]}. {o}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-[200px_1fr]">
                  <Input
                    value={isNat ? (d.nat_answer ?? "") : d.correct.map((n) => LETTERS[n - 1] ?? n).join(",")}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (isNat) update(i, { nat_answer: v });
                      else
                        update(i, {
                          correct: v
                            .split(/[,\s]+/)
                            .map((x) => x.trim().toUpperCase())
                            .filter(Boolean)
                            .map((x) => (/^[A-F]$/.test(x) ? x.charCodeAt(0) - 64 : Number(x)))
                            .filter((n) => Number.isFinite(n)),
                        });
                    }}
                    placeholder={isNat ? "Answer e.g. 4.0 to 4.2" : "Correct e.g. B or A,C"}
                  />
                  <p className="text-xs text-muted-foreground">{d.topic} — {d.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pick({
  value,
  onChange,
  options,
  small,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  small?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={small ? "h-8 w-auto min-w-20 text-xs" : ""}>
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
