import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addTopic,
  deleteTopic,
  fetchSyllabus,
  loadSyllabusSeed,
  resetSyllabus,
  toggleTopic,
} from "@/lib/data";
import { GATE_CS_SYLLABUS, GATE_DA_SYLLABUS } from "@/lib/syllabus";

export const Route = createFileRoute("/_authenticated/syllabus")({
  head: () => ({
    meta: [
      { title: "GATE CS Syllabus Tracker — GATE 2027 Study Tracker" },
      {
        name: "description",
        content:
          "Track, edit and master the complete GATE Computer Science and Data Science syllabus topic by topic.",
      },
      { property: "og:title", content: "GATE CS Syllabus Tracker — GATE 2027 Study Tracker" },
      {
        property: "og:description",
        content: "Check off every GATE CS topic and watch your completion climb.",
      },
    ],
  }),
  component: SyllabusPage,
});

type Track = "CS" | "DA";

function SyllabusPage() {
  const qc = useQueryClient();
  const [track, setTrack] = useState<Track>("CS");
  const [editing, setEditing] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [newSection, setNewSection] = useState("");

  const syllabus = useQuery({ queryKey: ["syllabus"], queryFn: fetchSyllabus });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["syllabus"] });

  const list = (syllabus.data ?? []).filter((s) => s.track === track);
  const sections = [...new Set(list.map((s) => s.section))];

  const load = useMutation({
    mutationFn: () =>
      loadSyllabusSeed(track, track === "CS" ? GATE_CS_SYLLABUS : GATE_DA_SYLLABUS),
    onSuccess: () => {
      toast.success("Syllabus loaded");
      invalidate();
    },
    onError: () => toast.error("Could not load syllabus"),
  });
  const reset = useMutation({
    mutationFn: () => resetSyllabus(track),
    onSuccess: () => {
      toast.success("Syllabus cleared");
      invalidate();
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => toggleTopic(id, completed),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteTopic, onSuccess: invalidate });
  const add = useMutation({
    mutationFn: ({ section, topic }: { section: string; topic: string }) =>
      addTopic({ track, section, topic, position: list.filter((l) => l.section === section).length }),
    onSuccess: () => {
      setNewTopic("");
      setNewSection("");
      invalidate();
    },
  });

  const done = list.filter((s) => s.completed).length;
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;

  function exportJson() {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gate-${track.toLowerCase()}-syllabus.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-extrabold text-primary">GATE {track} Syllabus</h1>
        <p className="text-sm text-muted-foreground">
          Track, edit, and master your exam preparation.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Overall {track} Completion</div>
              <div className="text-xs text-muted-foreground">
                {done} of {list.length} Topics Completed
              </div>
            </div>
            <div className="text-2xl font-extrabold text-primary">{pct}%</div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-2">
            {(["CS", "DA"] as Track[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={track === t ? "default" : "secondary"}
                onClick={() => setTrack(t)}
              >
                GATE {t}
              </Button>
            ))}
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={() => reset.mutate()} aria-label="Clear syllabus">
              <RotateCcw className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={exportJson} aria-label="Export syllabus">
              <Download className="size-4" />
            </Button>
          </div>
          {list.length === 0 && (
            <Button className="mt-4 w-full" disabled={load.isPending} onClick={() => load.mutate()}>
              Load official GATE {track} syllabus
            </Button>
          )}
        </div>
      </div>

      {list.length > 0 && (
        <div className="columns-1 gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {sections.map((section) => {
            const topics = list.filter((s) => s.section === section);
            const sDone = topics.filter((t) => t.completed).length;
            return (
              <div key={section} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                  <h2 className="font-bold text-primary">{section}</h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {sDone}/{topics.length}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditing(editing === section ? null : section)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {topics.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--primary)]"
                        checked={t.completed}
                        onChange={(e) => toggle.mutate({ id: t.id, completed: e.target.checked })}
                        aria-label={t.topic}
                      />
                      <span
                        className={
                          t.completed ? "flex-1 text-muted-foreground line-through" : "flex-1"
                        }
                      >
                        {t.topic}
                      </span>
                      {editing === section && (
                        <button
                          onClick={() => remove.mutate(t.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete topic"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {editing === section && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="New topic"
                      value={newTopic}
                      maxLength={100}
                      onChange={(e) => setNewTopic(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={!newTopic.trim()}
                      onClick={() => add.mutate({ section, topic: newTopic.trim() })}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {list.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-bold">Add Syllabus Section</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Section name"
              value={newSection}
              maxLength={60}
              onChange={(e) => setNewSection(e.target.value)}
            />
            <Input
              className="max-w-xs"
              placeholder="First topic"
              value={newTopic}
              maxLength={100}
              onChange={(e) => setNewTopic(e.target.value)}
            />
            <Button
              disabled={!newSection.trim() || !newTopic.trim()}
              onClick={() => add.mutate({ section: newSection.trim(), topic: newTopic.trim() })}
            >
              <Plus className="mr-1.5 size-4" /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
