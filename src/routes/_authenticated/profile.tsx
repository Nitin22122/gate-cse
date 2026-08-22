import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { BookOpen, Target, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  computeStreak,
  fetchProfile,
  fetchStreakDays,
  fetchStudyHours,
  fetchSubjects,
  fetchSyllabus,
  fetchTests,
  todayISO,
  updateProfile,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Analytics — GATE 2027 Study Tracker" },
      {
        name: "description",
        content:
          "Your account settings, focus statistics, subject-wise breakdown and syllabus completion in one place.",
      },
      { property: "og:title", content: "Profile & Analytics — GATE 2027 Study Tracker" },
      {
        property: "og:description",
        content: "Review your comprehensive GATE 2027 preparation analytics.",
      },
    ],
  }),
  component: ProfilePage,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function fmt(h: number) {
  const total = Math.round(h * 60);
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  return hrs ? `${hrs}h ${mins}m` : `${mins}m`;
}

function ProfilePage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    stream: "GATE",
    target_branch: "CS",
    about_me: "",
    social_links: "",
  });

  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const hours = useQuery({ queryKey: ["hours"], queryFn: fetchStudyHours });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const syllabus = useQuery({ queryKey: ["syllabus"], queryFn: fetchSyllabus });
  const tests = useQuery({ queryKey: ["tests"], queryFn: fetchTests });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => {
    if (profile.data)
      setForm({
        display_name: profile.data.display_name ?? "",
        username: profile.data.username ?? "",
        stream: profile.data.stream ?? "GATE",
        target_branch: profile.data.target_branch ?? "CS",
        about_me: profile.data.about_me ?? "",
        social_links: profile.data.social_links ?? "",
      });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateProfile(form),
    onSuccess: () => {
      toast.success("Profile updated");
      setEdit(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Could not update profile"),
  });

  const streakDays = useQuery({ queryKey: ["streak"], queryFn: fetchStreakDays });

  const rows = hours.data ?? [];
  const today = todayISO();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const sum = (f: (r: (typeof rows)[number]) => boolean) =>
    rows.filter(f).reduce((a, r) => a + Number(r.hours), 0);
  const todayH = sum((r) => r.log_date === today);
  const yestH = sum((r) => r.log_date === yesterday);
  const weekH = sum((r) => new Date(`${r.log_date}T00:00:00`) >= weekAgo);
  const allH = sum(() => true);
  const activeDays = new Set(rows.map((r) => r.log_date)).size;

  const subjName = (id: string) => subjects.data?.find((s) => s.id === id)?.name ?? "Subject";
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.subject_id, (totals.get(r.subject_id) ?? 0) + Number(r.hours));
  const pie = [...totals.entries()]
    .map(([id, value]) => ({ name: subjName(id), value }))
    .sort((a, b) => b.value - a.value);

  const tracks = ["CS", "DA"] as const;
  const streak = computeStreak(streakDays.data ?? []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-xl font-extrabold text-primary">
          {(form.display_name || "G").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">{form.display_name || "Your Profile"}</h1>
          <p className="text-sm text-muted-foreground">
            Review your comprehensive preparation analytics.
          </p>
        </div>
        <Link to="/syllabus">
          <Button variant="secondary" size="sm">
            <BookOpen className="mr-1.5 size-4" /> Syllabus
          </Button>
        </Link>
        <Link to="/tests">
          <Button variant="secondary" size="sm">
            <Target className="mr-1.5 size-4" /> Tests
          </Button>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <User className="size-4" /> Account Settings
          </h2>
          <Button size="sm" variant={edit ? "default" : "secondary"} onClick={() => setEdit(!edit)}>
            {edit ? "Cancel" : "Edit Details"}
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">FULL NAME</Label>
            <Input
              disabled={!edit}
              value={form.display_name}
              maxLength={80}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">
              UNIQUE USERNAME
            </Label>
            <Input
              disabled={!edit}
              value={form.username}
              maxLength={40}
              placeholder="@username"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">
              EMAIL ADDRESS <span className="text-destructive">LOCKED</span>
            </Label>
            <Input disabled value={email} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">STREAM</Label>
            <Input
              disabled={!edit}
              value={form.stream}
              maxLength={20}
              onChange={(e) => setForm({ ...form, stream: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">
              TARGET BRANCH
            </Label>
            <Input
              disabled={!edit}
              value={form.target_branch}
              maxLength={20}
              onChange={(e) => setForm({ ...form, target_branch: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">
              PREPARATION STREAK
            </Label>
            <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              🔥 Day {streak}
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[10px] tracking-widest text-muted-foreground">ABOUT ME</Label>
            <Textarea
              disabled={!edit}
              rows={3}
              maxLength={500}
              placeholder="No bio provided yet."
              value={form.about_me}
              onChange={(e) => setForm({ ...form, about_me: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">SOCIAL LINKS</Label>
            <Textarea
              disabled={!edit}
              rows={3}
              maxLength={300}
              placeholder="No social links added."
              value={form.social_links}
              onChange={(e) => setForm({ ...form, social_links: e.target.value })}
            />
          </div>
        </div>

        {edit && (
          <Button className="mt-4" disabled={save.isPending} onClick={() => save.mutate()}>
            Save changes
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["TODAY'S FOCUS", fmt(todayH)],
          ["YESTERDAY", fmt(yestH)],
          ["LAST 7 DAYS", fmt(weekH)],
          ["ALL-TIME TOTAL", fmt(allH)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[10px] tracking-widest text-muted-foreground">{l}</div>
            <div className="mt-2 text-2xl font-extrabold">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[10px] tracking-widest text-primary">WEEKLY AVG / DAY</div>
          <div className="mt-2 text-2xl font-extrabold">{fmt(weekH / 7)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[10px] tracking-widest text-primary">ALL-TIME AVG / DAY</div>
          <div className="mt-2 text-2xl font-extrabold">
            {fmt(activeDays ? allH / activeDays : 0)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-bold">Subject-wise Focus</h2>
        {pie.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No study hours logged yet.
          </p>
        ) : (
          <div className="mt-4 grid items-center gap-6 md:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" outerRadius={90}>
                    {pie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {pie.map((d, i) => (
                <li
                  key={d.name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="flex-1">{d.name}</span>
                  <span className="text-muted-foreground">
                    {Math.round((d.value / pie.reduce((a, x) => a + x.value, 0)) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-bold">Syllabus Completion</h2>
          <div className="mt-4 space-y-4">
            {tracks.map((t) => {
              const list = (syllabus.data ?? []).filter((s) => s.track === t);
              const done = list.filter((s) => s.completed).length;
              const pct = list.length ? Math.round((done / list.length) * 100) : 0;
              return (
                <div key={t} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>GATE {t === "CS" ? "Computer Science" : "Data Science & AI"}</span>
                    <span className="text-primary">{pct}%</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {done} of {list.length} topics checked
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-bold">Tests Breakdown</h2>
          {(tests.data ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No test series loaded into the database yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(
                (tests.data ?? []).reduce<Record<string, number>>((acc, t) => {
                  acc[t.test_type] = (acc[t.test_type] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([type, count]) => (
                <li
                  key={type}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span>{type}</span>
                  <span className="font-bold text-primary">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
