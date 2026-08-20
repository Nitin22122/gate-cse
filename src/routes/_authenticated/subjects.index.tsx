import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSubject, deleteSubject, fetchSessions, fetchSubjects } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/subjects/")({
  head: () => ({
    meta: [
      { title: "Subjects — GATE 2027 Study Tracker" },
      {
        name: "description",
        content: "Every GATE subject with teacher, source, schedule and lecture completion progress.",
      },
      { property: "og:title", content: "Subjects — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Manage subjects and their lecture sessions." },
    ],
  }),
  component: SubjectsPage,
});

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function SubjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    teacher: "",
    source: "",
    start_date: "",
    end_date: "",
  });

  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => fetchSessions() });

  const add = useMutation({
    mutationFn: () =>
      createSubject({
        name: form.name.trim(),
        teacher: form.teacher.trim() || null,
        source: form.source.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      }),
    onSuccess: () => {
      setOpen(false);
      setForm({ name: "", teacher: "", source: "", start_date: "", end_date: "" });
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject added");
    },
    onError: () => toast.error("Could not add subject"),
  });

  const remove = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Subject Cards</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 size-4" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Subject name</Label>
                <Input
                  value={form.name}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Teacher</Label>
                  <Input
                    value={form.teacher}
                    maxLength={80}
                    onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Input
                    value={form.source}
                    maxLength={60}
                    placeholder="Gate Wallah"
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!form.name.trim() || add.isPending}
                onClick={() => add.mutate()}
              >
                Create subject
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {subjects.data?.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No subjects yet. Add your first subject to start planning lectures.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(subjects.data ?? []).map((s) => {
          const list = (sessions.data ?? []).filter((x) => x.subject_id === s.id);
          const done = list.filter((x) => x.completed).length;
          const pct = list.length ? (done / list.length) * 100 : 0;
          return (
            <div
              key={s.id}
              className="group relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <button
                className="absolute right-4 top-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                onClick={() => remove.mutate(s.id)}
                aria-label={`Delete ${s.name}`}
              >
                <Trash2 className="size-4" />
              </button>
              <Link to="/subjects/$subjectId" params={{ subjectId: s.id }} className="block">
                <h2 className="text-lg font-bold text-primary">{s.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {s.teacher && <span className="text-sm font-semibold">{s.teacher}</span>}
                  {s.source && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
                      {s.source}
                    </span>
                  )}
                </div>
                {(s.start_date || s.end_date) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmt(s.start_date)} {s.end_date ? `— ${fmt(s.end_date)}` : ""}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  {list.length ? `${done} / ${list.length} sessions done` : "Not started yet"}
                </p>
                <div className="mt-2 h-1 w-full rounded-full bg-secondary">
                  <div
                    className="h-1 rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
