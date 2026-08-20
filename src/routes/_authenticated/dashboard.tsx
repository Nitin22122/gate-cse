import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Hourglass, Layers, X } from "lucide-react";
import { toast } from "sonner";

import { Countdown } from "@/components/Countdown";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { quoteOfTheDay } from "@/lib/constants";
import {
  deleteSession,
  fetchProfile,
  fetchSessions,
  fetchStudyHours,
  fetchSubjects,
  formatHours,
  todayISO,
  updateSession,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GATE 2027 Study Tracker" },
      {
        name: "description",
        content: "Today's target, countdown to GATE 2027 and your live study analysis in one view.",
      },
      { property: "og:title", content: "Dashboard — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Today's target and study analysis at a glance." },
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

  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => fetchSessions() });
  const hours = useQuery({ queryKey: ["hours"], queryFn: fetchStudyHours });

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

  const all = sessions.data ?? [];
  const todays = all.filter((s) => s.scheduled_date === today);
  const doneToday = todays.filter((s) => s.completed).length;
  const subjectName = (id: string) => subjects.data?.find((s) => s.id === id)?.name ?? "Subject";

  const totalHours = (hours.data ?? []).reduce((a, h) => a + Number(h.hours), 0);
  const perSubject = new Map<string, number>();
  for (const h of hours.data ?? [])
    perSubject.set(h.subject_id, (perSubject.get(h.subject_id) ?? 0) + Number(h.hours));
  const top = [...perSubject.entries()].sort((a, b) => b[1] - a[1])[0];
  const days = new Set((hours.data ?? []).map((h) => h.log_date)).size;

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

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Study Analysis</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Stat icon={<span />} value={`${totalHours.toFixed(1)}h`} label="TOTAL HOURS" />
          <Stat
            icon={<span />}
            value={top ? subjectName(top[0]).split(" ")[0]! : "—"}
            label="TOP SUBJECT"
          />
          <Stat icon={<span />} value={String(days)} label="DAYS LOGGED" />
          <Stat
            icon={<span />}
            value={days ? `${(totalHours / days).toFixed(1)}h` : "0h"}
            label="AVG DAILY"
          />
        </div>
      </section>
    </div>
  );
}
