import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  createStudyHour,
  deleteStudyHour,
  fetchStudyHours,
  fetchSubjects,
  todayISO,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/analysis")({
  head: () => ({
    meta: [
      { title: "Study Hours Analysis — GATE 2027 Study Tracker" },
      {
        name: "description",
        content:
          "Log hours per subject and see weekly, monthly and all-time breakdowns of your study time.",
      },
      { property: "og:title", content: "Study Hours Analysis — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Subject-wise study hour analytics for GATE 2027." },
    ],
  }),
  component: AnalysisPage,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type Range = "week" | "month" | "all";

function AnalysisPage() {
  const qc = useQueryClient();
  const [range, setRange] = useState<Range>("week");
  const [form, setForm] = useState({ subject_id: "", log_date: todayISO(), hours: "" });

  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const hours = useQuery({ queryKey: ["hours"], queryFn: fetchStudyHours });

  const add = useMutation({
    mutationFn: () =>
      createStudyHour({
        subject_id: form.subject_id,
        log_date: form.log_date,
        hours: Number(form.hours),
      }),
    onSuccess: () => {
      setForm({ ...form, hours: "" });
      toast.success("Hours logged");
      qc.invalidateQueries({ queryKey: ["hours"] });
    },
    onError: () => toast.error("Could not log hours"),
  });
  const remove = useMutation({
    mutationFn: deleteStudyHour,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hours"] }),
  });

  const cutoff = new Date();
  if (range === "week") cutoff.setDate(cutoff.getDate() - 7);
  if (range === "month") cutoff.setMonth(cutoff.getMonth() - 1);
  const rows = (hours.data ?? []).filter(
    (h) => range === "all" || new Date(`${h.log_date}T00:00:00`) >= cutoff,
  );

  const name = (id: string) => subjects.data?.find((s) => s.id === id)?.name ?? "Subject";
  const totals = new Map<string, number>();
  for (const h of rows) totals.set(h.subject_id, (totals.get(h.subject_id) ?? 0) + Number(h.hours));
  const data = [...totals.entries()]
    .map(([id, value]) => ({ name: name(id), value }))
    .sort((a, b) => b.value - a.value);
  const total = data.reduce((a, d) => a + d.value, 0);
  const days = new Set(rows.map((h) => h.log_date)).size;
  const today = rows.filter((h) => h.log_date === todayISO());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Subject-wise Study Hours</h1>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.log_date}
              onChange={(e) => setForm({ ...form, log_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={form.subject_id}
              onValueChange={(v) => setForm({ ...form, subject_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Hours</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!form.subject_id || !Number(form.hours) || add.isPending}
              onClick={() => add.mutate()}
            >
              <Plus className="mr-1.5 size-4" /> Add Hours
            </Button>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <h2 className="text-sm font-bold">Today&apos;s Summary</h2>
          {today.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No entries for today</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {today.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3">
                  <span>{name(h.subject_id)}</span>
                  <span className="flex items-center gap-3 text-primary">
                    {Number(h.hours)}h
                    <button
                      onClick={() => remove.mutate(h.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {(["week", "month", "all"] as Range[]).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "secondary"}
            onClick={() => setRange(r)}
          >
            {r === "week" ? "Weekly" : r === "month" ? "Monthly" : "All Time"}
          </Button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No study hours logged for this period yet.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="relative h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={2}>
                    {data.map((_, i) => (
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
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold">{total.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">Total Hours</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 self-center">
              {[
                [`${total.toFixed(1)}h`, "TOTAL HOURS"],
                [String(data.length), "SUBJECTS"],
                [data[0]!.name.split(" ")[0]!, "TOP SUBJECT"],
                [`${data[0]!.value}h`, "TOP HOURS"],
                [String(days), "DAYS"],
                [days ? `${(total / days).toFixed(1)}h` : "0h", "AVG DAILY"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-lg border border-border bg-background p-4 text-center">
                  <div className="text-lg font-extrabold text-primary">{v}</div>
                  <div className="mt-1 text-[10px] tracking-widest text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-bold">Subject Breakdown</h2>
            <ul className="mt-3 divide-y divide-border">
              {data.map((d, i) => (
                <li key={d.name} className="flex items-center gap-3 py-2 text-sm">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="flex-1">{d.name}</span>
                  <span className="text-muted-foreground">{d.value}h</span>
                  <span className="w-12 text-right font-bold text-primary">
                    {Math.round((d.value / total) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
