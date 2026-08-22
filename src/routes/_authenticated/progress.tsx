import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMistake,
  deleteMistake,
  fetchMistakes,
  
  fetchSubjects,
  updateMistake,
} from "@/lib/data";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Mistake Logs — GATE 2027 Study Tracker" },
      {
        name: "description",
        content: "Log every silly error and concept slip so it never repeats on exam day.",
      },
      { property: "og:title", content: "Mistake Logs — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Track and resolve your recurring GATE mistakes." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", details: "", subject_id: "" });

  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const mistakes = useQuery({ queryKey: ["mistakes"], queryFn: fetchMistakes });

  const add = useMutation({
    mutationFn: () =>
      createMistake({
        title: form.title.trim(),
        details: form.details.trim(),
        subject_id: form.subject_id || null,
      }),
    onSuccess: () => {
      setForm({ title: "", details: "", subject_id: "" });
      toast.success("Mistake logged");
      qc.invalidateQueries({ queryKey: ["mistakes"] });
    },
    onError: () => toast.error("Could not save"),
  });
  const toggle = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      updateMistake(id, { resolved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mistakes"] }),
  });
  const remove = useMutation({
    mutationFn: deleteMistake,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mistakes"] }),
  });

  const name = (id: string | null) =>
    id ? (subjects.data?.find((s) => s.id === id)?.name ?? "General") : "General";

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-extrabold">Mistake Logs</h1>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-1.5">
              <Label>Mistake</Label>
              <Input
                value={form.title}
                maxLength={140}
                placeholder="Forgot to check functional dependency closure"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={form.subject_id}
                onValueChange={(v) => setForm({ ...form, subject_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
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
              <Label>What to remember</Label>
              <Textarea
                rows={4}
                maxLength={1000}
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              disabled={!form.title.trim() || add.isPending}
              onClick={() => add.mutate()}
            >
              <Plus className="mr-1.5 size-4" /> Log mistake
            </Button>
          </div>

          <div className="space-y-2">
            {(mistakes.data ?? []).length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                No mistakes logged yet.
              </p>
            )}
            {(mistakes.data ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <Checkbox
                  checked={m.resolved}
                  onCheckedChange={(v) => toggle.mutate({ id: m.id, resolved: Boolean(v) })}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${m.resolved ? "line-through opacity-60" : ""}`}>
                    {m.title}
                  </p>
                  {m.details && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {m.details}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                      {name(m.subject_id)}
                    </span>
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(m.id)}
                  aria-label="Delete mistake"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
