import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
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
import { createTest, deleteAllTests, deleteTest, fetchTests, updateTest } from "@/lib/data";
import { TEST_ORGS, TEST_TYPES } from "@/lib/syllabus";

export const Route = createFileRoute("/_authenticated/tests")({
  head: () => ({
    meta: [
      { title: "Tests & Score Analysis — GATE 2027 Study Tracker" },
      {
        name: "description",
        content:
          "Track your GATE test series: scores, attempt time, analysis time and average performance by test type.",
      },
      { property: "og:title", content: "Tests & Score Analysis — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Test series performance analytics for GATE 2027." },
    ],
  }),
  component: TestsPage,
});

function TestsPage() {
  const qc = useQueryClient();
  const [onlyAttempted, setOnlyAttempted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    organization: TEST_ORGS[0] as string,
    test_type: TEST_TYPES[0] as string,
    category: "",
  });

  const tests = useQuery({ queryKey: ["tests"], queryFn: fetchTests });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tests"] });

  const add = useMutation({
    mutationFn: () => createTest({ ...form, category: form.category || null }),
    onSuccess: () => {
      setForm({ ...form, name: "", category: "" });
      toast.success("Test added");
      invalidate();
    },
    onError: () => toast.error("Could not add test"),
  });
  const patch = useMutation({
    mutationFn: ({ id, ...rest }: { id: string } & Record<string, unknown>) =>
      updateTest(id, rest as never),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteTest, onSuccess: invalidate });
  const wipe = useMutation({
    mutationFn: deleteAllTests,
    onSuccess: () => {
      toast.success("All test data deleted");
      invalidate();
    },
  });

  const all = tests.data ?? [];
  const attempted = all.filter((t) => t.attempted);
  const rows = onlyAttempted ? attempted : all;

  const avg = (nums: number[]) =>
    nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
  const pctFor = (type?: string) =>
    avg(
      attempted
        .filter((t) => (type ? t.test_type === type : true))
        .filter((t) => t.score != null && Number(t.max_score) > 0)
        .map((t) => (Number(t.score) / Number(t.max_score)) * 100),
    );

  const stats: [string, string][] = [
    ["AVG TOPIC SCORE", `${pctFor("Topic Test")}%`],
    ["AVG SUBJECT SCORE", `${pctFor("Subject Test")}%`],
    ["AVG FULL MOCK SCORE", `${pctFor("Full Mock")}%`],
    ["AVG WEEKLY SCORE", `${pctFor("Weekly Test")}%`],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Tests & Score Analysis</h1>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[10px] tracking-widest text-muted-foreground">TOTAL PROGRESS</div>
          <div className="mt-2 text-2xl font-extrabold">
            {attempted.length} <span className="text-sm text-muted-foreground">/ {all.length}</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${all.length ? (attempted.length / all.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[10px] tracking-widest text-muted-foreground">AVG. ACTUAL TIME</div>
          <div className="mt-2 text-2xl font-extrabold text-primary">
            {avg(attempted.map((t) => Number(t.actual_time_mins ?? 0)))}{" "}
            <span className="text-sm font-normal text-muted-foreground">mins</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[10px] tracking-widest text-muted-foreground">AVG. ANALYSIS TIME</div>
          <div className="mt-2 text-2xl font-extrabold text-chart-3">
            {avg(attempted.map((t) => Number(t.analysis_time_mins ?? 0)))}{" "}
            <span className="text-sm font-normal text-muted-foreground">mins</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-5 text-center">
            <div className="text-[10px] tracking-widest text-muted-foreground">{l}</div>
            <div className="mt-2 text-2xl font-extrabold">{v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
              Main Test Series
            </span>
            <div className="mt-3 inline-block rounded-md border border-border px-3 py-1.5 text-xs">
              Main Series: <span className="font-bold text-primary">{attempted.length}</span> /{" "}
              {all.length}
            </div>
          </div>
          <Button
            size="sm"
            variant={onlyAttempted ? "default" : "secondary"}
            onClick={() => setOnlyAttempted(!onlyAttempted)}
          >
            Attempted Only
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-background py-16 text-center">
            <Target className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-bold">No Tests Found</p>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t added any tests to this series yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {rows.map((t) => (
              <div
                key={t.id}
                className="grid items-center gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--primary)]"
                      checked={t.attempted}
                      onChange={(e) =>
                        patch.mutate({ id: t.id, attempted: e.target.checked })
                      }
                      aria-label="Attempted"
                    />
                    <span className="font-bold">{t.name}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {t.test_type}
                    </span>
                    {t.category && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {t.category}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.organization}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-20"
                    type="number"
                    placeholder="Score"
                    defaultValue={t.score ?? ""}
                    onBlur={(e) =>
                      patch.mutate({ id: t.id, score: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                  <Input
                    className="w-20"
                    type="number"
                    placeholder="Max"
                    defaultValue={t.max_score ?? ""}
                    onBlur={(e) =>
                      patch.mutate({
                        id: t.id,
                        max_score: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  <Input
                    className="w-24"
                    type="number"
                    placeholder="Time m"
                    defaultValue={t.actual_time_mins ?? ""}
                    onBlur={(e) =>
                      patch.mutate({
                        id: t.id,
                        actual_time_mins: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  <Input
                    className="w-24"
                    type="number"
                    placeholder="Analysis m"
                    defaultValue={t.analysis_time_mins ?? ""}
                    onBlur={(e) =>
                      patch.mutate({
                        id: t.id,
                        analysis_time_mins: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  <button
                    onClick={() => remove.mutate(t.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete test"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-bold">Add Custom Test</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">TEST NAME</Label>
            <Input
              placeholder="E.g., AIMT 1"
              value={form.name}
              maxLength={80}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">ORGANIZATION</Label>
            <Select
              value={form.organization}
              onValueChange={(v) => setForm({ ...form, organization: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_ORGS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">TEST TYPE</Label>
            <Select value={form.test_type} onValueChange={(v) => setForm({ ...form, test_type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_TYPES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] tracking-widest text-muted-foreground">
              SUBJECT / CATEGORY
            </Label>
            <Input
              placeholder="E.g., Algorithms"
              value={form.category}
              maxLength={60}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!form.name.trim() || add.isPending}
              onClick={() => add.mutate()}
            >
              <Plus className="mr-1.5 size-4" /> Add
            </Button>
          </div>
        </div>
      </div>

      {all.length > 0 && (
        <div className="text-center">
          <Button variant="destructive" size="sm" onClick={() => wipe.mutate()}>
            <Trash2 className="mr-1.5 size-4" /> Delete All Test Data
          </Button>
        </div>
      )}
    </div>
  );
}
