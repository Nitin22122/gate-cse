import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Square, Trash2, Upload } from "lucide-react";
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
  PRACTICE_LEVELS,
  PRACTICE_SUBJECTS,
  PRACTICE_TAGS,
  submitQuestions,
  uploadPyqImage,
  type QuestionInput,
} from "@/lib/data";
import { extractPyqFromPages, type PdfDraftQuestion } from "@/lib/pyq-ai.functions";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const BATCH = 3;
const STEP = 2;

type RenderedPage = { page: number; image: string; canvas: HTMLCanvasElement };
type Draft = PdfDraftQuestion & { figureBlob?: Blob | null; figureUrl?: string | null };

function cropFigure(pages: RenderedPage[], f: NonNullable<PdfDraftQuestion["figure"]>) {
  const src = pages.find((p) => p.page === f.page);
  if (!src) return Promise.resolve(null);
  const clamp = (v: number) => Math.min(1000, Math.max(0, v));
  const x0 = clamp(Math.min(f.x0, f.x1) - 10), x1 = clamp(Math.max(f.x0, f.x1) + 10);
  const y0 = clamp(Math.min(f.y0, f.y1) - 10), y1 = clamp(Math.max(f.y0, f.y1) + 10);
  const W = src.canvas.width, H = src.canvas.height;
  const sx = (x0 / 1000) * W, sy = (y0 / 1000) * H, sw = ((x1 - x0) / 1000) * W, sh = ((y1 - y0) / 1000) * H;
  if (sw < 20 || sh < 20) return Promise.resolve(null);
  const out = document.createElement("canvas");
  out.width = Math.round(sw);
  out.height = Math.round(sh);
  out.getContext("2d")!.drawImage(src.canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return new Promise<Blob | null>((res) => out.toBlob((b) => res(b), "image/jpeg", 0.9));
}

async function renderPdf(file: File, onPage: (n: number, t: number) => void) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
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
    pages.push({ page: i, image: canvas.toDataURL("image/jpeg", 0.75), canvas });
    onPage(i, doc.numPages);
  }
  return pages;
}

export function PracticePdfImporter() {
  const qc = useQueryClient();
  const extract = useServerFn(extractPyqFromPages);
  const [file, setFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState<string>("Medium");
  const [tag, setTag] = useState<string>("Untagged");
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
      const pages = await renderPdf(file, (n, t) => {
        setStatus(`Reading page ${n} of ${t}…`);
        setProgress(Math.round((n / t) * 15));
      });
      const windows: (typeof pages)[] = [];
      for (let i = 0; i < pages.length; i += STEP) {
        windows.push(pages.slice(i, i + BATCH));
        if (i + BATCH >= pages.length) break;
      }
      const byKey = new Map<string, Draft>();
      for (let w = 0; w < windows.length; w++) {
        if (stopRef.current) break;
        const win = windows[w]!;
        setStatus(`AI reading pages ${win[0]!.page}–${win[win.length - 1]!.page} (batch ${w + 1} of ${windows.length})…`);
        const res = await extract({
          data: { pages: win.map(({ page, image }) => ({ page, image })), year: new Date().getFullYear(), paper: "practice set", answerKey: null },
        });
        for (const q of res.questions) {
          const k = q.question.slice(0, 60).toLowerCase();
          const prev = byKey.get(k);
          if (prev && prev.question.length >= q.question.length) continue;
          const figureBlob = q.figure ? await cropFigure(pages, q.figure) : null;
          byKey.set(k, { ...q, figureBlob, figureUrl: figureBlob ? URL.createObjectURL(figureBlob) : null });
        }
        setDrafts([...byKey.values()]);
        setProgress(15 + Math.round(((w + 1) / windows.length) * 85));
      }
      setStatus(stopRef.current ? `Stopped. ${byKey.size} questions so far.` : `Done — ${byKey.size} questions extracted. Review, then publish.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      setStatus(msg);
      toast.error(msg);
    } finally {
      setRunning(false);
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      const rows: QuestionInput[] = [];
      for (const d of drafts) {
        const isNat = d.qtype === "NAT" || d.options.length === 0;
        const idx = d.correct.filter((n) => n >= 1 && n <= d.options.length).map((n) => n - 1);
        const image_path = d.figureBlob ? await uploadPyqImage(d.figureBlob, `practice-q.jpg`) : null;
        rows.push({
          subject: d.subject,
          qtype: isNat ? "NAT" : d.qtype,
          difficulty,
          tag,
          question: d.question,
          options: isNat ? [] : d.options,
          correct_index: idx[0] ?? 0,
          correct_indices: isNat ? null : idx,
          nat_answer: isNat ? (d.nat_answer ?? null) : null,
          image_path,
          explanation: d.explanation || "",
        });
      }
      const n = await submitQuestions(rows);
      toast.success(`Published ${n} questions to the Practice Arena`);
      setDrafts([]);
      setStatus("");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a PDF of questions (DPP, test, notes). AI reads every page and pulls out each question,
        options, type, correct answer, subject and an explanation. Review, then publish.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="prac-pdf">Questions PDF</Label>
          <Input id="prac-pdf" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Difficulty</Label>
          <Pick value={difficulty} onChange={setDifficulty} options={PRACTICE_LEVELS} />
        </div>
        <div className="grid gap-1.5">
          <Label>Tag</Label>
          <Pick value={tag} onChange={setTag} options={PRACTICE_TAGS} />
        </div>
      </div>
      <div className="flex gap-2">
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
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
      )}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold">Review {drafts.length} questions</h3>
            <Button className="ml-auto" disabled={running || publishing} onClick={publish}>
              {publishing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Publish all
            </Button>
          </div>
          {drafts.map((d, i) => {
            const isNat = d.qtype === "NAT" || d.options.length === 0;
            return (
              <div key={i} className="rounded-xl border border-border bg-background p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{d.qtype}</Badge>
                  <div className="ml-auto flex gap-2">
                    <Pick small value={d.subject} onChange={(v) => update(i, { subject: v as PdfDraftQuestion["subject"] })} options={PRACTICE_SUBJECTS} />
                    <Button size="icon" variant="ghost" aria-label="Remove question" onClick={() => setDrafts((x) => x.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap font-medium">{d.question}</p>
                {d.figureUrl && (
                  <div className="mt-2 flex items-start gap-2">
                    <img src={d.figureUrl} alt="Extracted figure" className="max-h-48 rounded border border-border bg-background" />
                    <Button size="sm" variant="ghost" onClick={() => update(i, { figureBlob: null, figureUrl: null })}>Remove picture</Button>
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
                {isNat && <p className="mt-2 text-primary">Answer: {d.nat_answer}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{d.explanation}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pick({ value, onChange, options, small }: { value: string; onChange: (v: string) => void; options: readonly string[]; small?: boolean }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={small ? "h-8 w-auto min-w-20 text-xs" : ""}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
