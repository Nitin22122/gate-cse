import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function SubjectDetail() {
  const { subjectId } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const emptyForm = {
    title: "",
    scheduled_date: todayISO(),
    hours: 0,
    minutes: 30,
    topics: "",
    tag: SESSION_TAGS[0] as string,
  };
  const [form, setForm] = useState(emptyForm);

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
      await createSession({
        subject_id: subjectId,
        title: form.title.trim(),
        scheduled_date: form.scheduled_date,
        duration_minutes: Math.max(5, form.hours * 60 + form.minutes),
        tag: form.tag,
        topics: form.topics.trim() || null,
        position: list.length,
      });
    },
    onSuccess: () => {
      setForm({ ...emptyForm, scheduled_date: form.scheduled_date });
      setOpen(false);
      toast.success("Session added — it appears in Today's Target on its date");
      invalidate();
    },
    onError: () => toast.error("Could not add session"),
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
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-semibold ${s.completed ? "text-muted-foreground line-through" : ""}`}
              >
                {s.title}
              </p>
              {s.topics && (
                <p className="truncate text-[11px] text-muted-foreground">{s.topics}</p>
              )}
            </div>
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

      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <Plus className="mr-1.5 size-4" /> Add New Session
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Session Name *</Label>
              <Input
                value={form.title}
                maxLength={140}
                placeholder="e.g., Graph Theory 01"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hours</Label>
                <Input
                  type="number"
                  min={0}
                  max={12}
                  value={form.hours}
                  onChange={(e) =>
                    setForm({ ...form, hours: Math.min(12, Math.max(0, Number(e.target.value) || 0)) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  placeholder="e.g., 30"
                  value={form.minutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minutes: Math.min(59, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Topics Covered</Label>
              <Input
                value={form.topics}
                maxLength={200}
                placeholder="e.g., Basics, Graph Theory"
                onChange={(e) => setForm({ ...form, topics: e.target.value })}
              />
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
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-[2]"
                disabled={!form.title.trim() || add.isPending}
                onClick={() => add.mutate()}
              >
                <Check className="mr-1.5 size-4" /> Add Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
