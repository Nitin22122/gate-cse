import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Flame, Hourglass, Layers, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { quoteOfTheDay } from "@/lib/constants";
import {
  checkInToday,
  computeStreak,
  createTask,
  deleteSession,
  deleteTask,
  fetchProfile,
  fetchSessions,
  fetchStreakDays,
  fetchSubjects,
  fetchTasks,
  formatHours,
  todayISO,
  updateSession,
  updateTask,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GATE 2027 Study Tracker" },
      {
        name: "description",
        content: "Today's target, study tasks, daily streak and countdown to GATE 2027 in one view.",
      },
      { property: "og:title", content: "Dashboard — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Today's target, tasks and streak at a glance." },
    ],
  }),
  component: Dashboard,
});

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center">
      <div className="flex justify-center text-primary">{icon}</div>
      <div className="mt-2 text-3xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const today = todayISO();
  const [taskTitle, setTaskTitle] = useState("");

  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => fetchSessions() });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const streakDays = useQuery({ queryKey: ["streak"], queryFn: fetchStreakDays });

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      updateSession(id, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
    onError: () => toast.error("Could not update session"),
  });
  const remove = useMutation({
    mutationFn: deleteSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const invalidateTasks = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const addTask = useMutation({
    mutationFn: () => createTask(taskTitle.trim()),
    onSuccess: () => {
      setTaskTitle("");
      invalidateTasks();
    },
    onError: () => toast.error("Could not add task"),
  });
  const toggleTask = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      updateTask(id, { completed }),
    onSuccess: invalidateTasks,
  });
  const removeTask = useMutation({ mutationFn: deleteTask, onSuccess: invalidateTasks });

  const checkIn = useMutation({
    mutationFn: checkInToday,
    onSuccess: () => {
      toast.success("Streak marked for today 🔥");
      qc.invalidateQueries({ queryKey: ["streak"] });
    },
    onError: () => toast.error("Could not mark streak"),
  });

  const days = streakDays.data ?? [];
  const streak = computeStreak(days);
  const checkedInToday = days.includes(today);

  const all = sessions.data ?? [];
  const todays = all.filter((s) => s.scheduled_date === today);
  const doneToday = todays.filter((s) => s.completed).length;
  const subjectName = (id: string) => subjects.data?.find((s) => s.id === id)?.name ?? "Subject";

  const prepDay = profile.data
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(`${profile.data.prep_start_date}T00:00:00`).getTime()) / 86400000,
        ) + 1,
      )
    : 1;

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
          <Flame className="size-4 text-primary" />
          <span className="text-sm font-bold text-primary">Day {streak}</span>
          <button
            type="button"
            onClick={() => checkIn.mutate()}
            disabled={checkedInToday || checkIn.isPending}
            aria-label={checkedInToday ? "Streak already marked today" : "Mark today's streak"}
            title={checkedInToday ? "Already marked today" : "Mark today"}
            className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-primary transition-colors hover:bg-primary/30 disabled:opacity-50"
          >
            {checkedInToday ? <CheckCircle2 className="size-3.5" /> : <Plus className="size-3.5" />}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-lg font-medium text-foreground md:text-xl">{quoteOfTheDay()}</p>
        <p className="mt-2 text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
          DAY <span className="text-primary">{prepDay}</span> OF PREPARATION
        </p>
        {profile.data && (
          <div className="mt-6 border-t border-border pt-6">
            <Countdown examDate={profile.data.exam_date} />
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<Layers className="size-6" />}
          value={String(subjects.data?.length ?? 0)}
          label="TOTAL SUBJECTS"
        />
        <Stat
          icon={<BookOpen className="size-6" />}
          value={String(all.length)}
          label="TOTAL SESSIONS"
        />
        <Stat
          icon={<CheckCircle2 className="size-6" />}
          value={String(all.filter((s) => s.completed).length)}
          label="COMPLETED"
        />
      </section>

      <section className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (taskTitle.trim()) addTask.mutate();
          }}
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5"
        >
          <Plus className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={taskTitle}
            maxLength={160}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Add a new study task…"
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="sm" disabled={!taskTitle.trim() || addTask.isPending}>
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </form>

        <div className="space-y-2 rounded-2xl border border-dashed border-border bg-card/40 p-4">
          {(tasks.data ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tasks yet. Add a test, revision or anything you need to get done.
            </p>
          )}
          {(tasks.data ?? []).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5"
            >
              <Checkbox
                checked={t.completed}
                onCheckedChange={(v) => toggleTask.mutate({ id: t.id, completed: Boolean(v) })}
              />
              <p
                className={`min-w-0 flex-1 truncate text-sm ${t.completed ? "text-muted-foreground line-through" : ""}`}
              >
                {t.title}
              </p>
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeTask.mutate(t.id)}
                aria-label="Delete task"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Today&apos;s Target</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {doneToday} / {todays.length} completed
            </span>
            <Progress
              value={todays.length ? (doneToday / todays.length) * 100 : 0}
              className="w-32"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {todays.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sessions scheduled for today. Add lectures inside a subject and they show up here
              automatically.
            </p>
          )}
          {todays.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
            >
              <Checkbox
                checked={s.completed}
                onCheckedChange={(v) => toggle.mutate({ id: s.id, completed: Boolean(v) })}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-semibold ${s.completed ? "text-muted-foreground line-through" : ""}`}
                >
                  {s.title}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                    {subjectName(s.subject_id)}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                    {formatHours(s.duration_minutes)}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                    {s.tag}
                  </span>
                </div>
              </div>
              <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                {s.completed ? (
                  <>
                    <CheckCircle2 className="size-3.5 text-primary" /> Done
                  </>
                ) : (
                  <>
                    <Hourglass className="size-3.5" /> Pending
                  </>
                )}
              </span>
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove.mutate(s.id)}
                aria-label="Remove from today"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
