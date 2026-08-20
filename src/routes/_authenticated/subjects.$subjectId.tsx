import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createSession,
  deleteSession,
  fetchSessions,
  fetchSubjects,
  formatHours,
  SESSION_TAGS,
  todayISO,
  updateSession,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/subjects/$subjectId")({
  head: () => ({
    meta: [
      { title: "Subject sessions — GATE 2027 Study Tracker" },
      {
        name: "description",
        content: "Add lectures, set dates, watch time and tags, then tick them off as you finish.",
      },
      { property: "og:title", content: "Subject sessions — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Plan and track every lecture of a subject." },
    ],
  }),
  component: SubjectDetail,
});

const DURATIONS = [30, 60, 90, 120, 150, 180, 210, 240];

function SubjectDetail() {
  const { subjectId } = Route.useParams();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    scheduled_date: todayISO(),
    duration_minutes: 120,
    tag: SESSION_TAGS[0] as string,
    count: 1,
  });

  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const sessions = useQuery({
    queryKey: ["sessions", subjectId],
    queryFn: () => fetchSessions(subjectId),
  });

  const subject = subjects.data?.find((s) => s.id === subjectId);
  const list = sessions.data ?? [];
  const done = list.filter((s) => s.completed).length;
  const totalMinutes = list.reduce((a, s) => a + s.duration_minutes, 0);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["sessions"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const base = list.length;
      const start = new Date(`${form.scheduled_date}T00:00:00`);
      for (let i = 0; i < form.count; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        await createSession({
          subject_id: subjectId,
          title: form.count > 1 ? `${form.title.trim()} - ${String(i + 1).padStart(2, "0")}` : form.title.trim(),
          scheduled_date: d.toISOString().slice(0, 10),
          duration_minutes: form.duration_minutes,
          tag: form.tag,
          position: base + i,
        });
      }
    },
    onSuccess: () => {
      setForm({ ...form, title: "", count: 1 });
      toast.success("Sessions added — they appear in Today's Target on their date");
      invalidate();
    },
    onError: () => toast.error("Could not add sessions"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      updateSession(id, { completed }),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteSession, onSuccess: invalidate });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/subjects">
            <Button variant="secondary" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold">{subject?.name ?? "Subject"}</h1>
            <p className="text-sm text-muted-foreground">
              {[subject?.teacher, subject?.source].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex gap-6 rounded-xl border border-border bg-card px-6 py-3 text-center">
          <div>
            <div className="text-xl font-extrabold text-primary">{list.length}</div>
            <div className="text-[10px] tracking-widest text-muted-foreground">TOTAL</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-primary">{done}</div>
            <div className="text-[10px] tracking-widest text-muted-foreground">COMPLETED</div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-primary">
              {list.length ? Math.round((done / list.length) * 100) : 0}%
            </div>
            <div className="text-[10px] tracking-widest text-muted-foreground">PROGRESS</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
        {list.length} sessions added · Completed: <span className="text-primary">{done}</span> /{" "}
        {list.length} · Total watch time:{" "}
        <span className="font-semibold text-foreground">{formatHours(totalMinutes)}</span>
      </div>

      <div className="space-y-2">
        {list.map((s, i) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <span className="w-8 text-xs text-muted-foreground">#{i + 1}</span>
            <span className="hidden w-24 text-xs text-muted-foreground sm:block">
              {new Date(`${s.scheduled_date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-sm font-semibold ${s.completed ? "text-muted-foreground line-through" : ""}`}
            >
              {s.title}
            </span>
            <span className="hidden rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground md:block">
              {s.tag}
            </span>
            <span className="w-16 text-right text-xs font-semibold text-primary">
              {formatHours(s.duration_minutes)}
            </span>
            <Checkbox
              checked={s.completed}
              onCheckedChange={(v) => toggle.mutate({ id: s.id, completed: Boolean(v) })}
            />
            <button
              className="text-muted-foreground hover:text-destructive"
              onClick={() => remove.mutate(s.id)}
              aria-label="Delete session"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Plus className="size-4" /> Add new session(s)
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Lecture / topic</Label>
            <Input
              value={form.title}
              maxLength={140}
              placeholder="Transactions and Concurrency Control"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input
              type="date"
              value={form.scheduled_date}
              onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Watch time</Label>
            <Select
              value={String(form.duration_minutes)}
              onValueChange={(v) => setForm({ ...form, duration_minutes: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {formatHours(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tag</Label>
            <Select value={form.tag} onValueChange={(v) => setForm({ ...form, tag: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TAGS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>How many parts?</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={form.count}
              onChange={(e) =>
                setForm({ ...form, count: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })
              }
            />
          </div>
          <div className="flex items-end md:col-span-5">
            <Button
              disabled={!form.title.trim() || add.isPending}
              onClick={() => add.mutate()}
              className="w-full md:w-auto"
            >
              <Check className="mr-1.5 size-4" /> Add session{form.count > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Parts are numbered automatically (- 01, - 02 …) and scheduled on consecutive days.
        </p>
      </div>
    </div>
  );
}
