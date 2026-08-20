import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createJournal, deleteJournal, fetchJournal } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Daily Journal — GATE 2027 Study Tracker" },
      {
        name: "description",
        content: "Reflect on every study session and keep a searchable log of your GATE prep days.",
      },
      { property: "og:title", content: "Daily Journal — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Write and revisit your daily study reflections." },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const entries = useQuery({ queryKey: ["journal"], queryFn: fetchJournal });

  const save = useMutation({
    mutationFn: () => createJournal(text.trim()),
    onSuccess: () => {
      setText("");
      toast.success("Entry saved");
      qc.invalidateQueries({ queryKey: ["journal"] });
    },
    onError: () => toast.error("Could not save entry"),
  });
  const remove = useMutation({
    mutationFn: deleteJournal,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal"] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Daily Journal</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
            rows={8}
            placeholder="How did your study session go today? What did you learn? What challenges did you face?"
          />
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => text.trim() && save.mutate()}
              disabled={!text.trim() || save.isPending}
            >
              <Save className="mr-1.5 size-4" /> Save Entry
            </Button>
            <Button variant="secondary" onClick={() => setText("")}>
              Clear
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-bold tracking-wide">Recent Entries</h2>
          <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {(entries.data ?? []).length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">No entries yet.</p>
            )}
            {(entries.data ?? []).map((e) => (
              <article
                key={e.id}
                className="group rounded-lg border-l-2 border-primary bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <time className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </time>
                  <button
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    onClick={() => remove.mutate(e.id)}
                    aria-label="Delete entry"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{e.content}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
