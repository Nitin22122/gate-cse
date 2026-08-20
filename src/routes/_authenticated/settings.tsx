import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchProfile, updateProfile } from "@/lib/data";
import { TIMER_URL } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — GATE 2027 Study Tracker" },
      {
        name: "description",
        content: "Set your display name, exam date and preparation start date.",
      },
      { property: "og:title", content: "Settings — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Personalise your GATE 2027 countdown and profile." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const [form, setForm] = useState({ display_name: "", exam_date: "", prep_start_date: "" });

  useEffect(() => {
    if (profile.data)
      setForm({
        display_name: profile.data.display_name ?? "",
        exam_date: profile.data.exam_date,
        prep_start_date: profile.data.prep_start_date,
      });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateProfile(form),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Could not save settings"),
  });

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input
            value={form.display_name}
            maxLength={80}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Exam date (countdown target)</Label>
          <Input
            type="date"
            value={form.exam_date}
            onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Preparation start date</Label>
          <Input
            type="date"
            value={form.prep_start_date}
            onChange={(e) => setForm({ ...form, prep_start_date: e.target.value })}
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Save changes
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Focus Timer is linked to your external app:{" "}
        <a className="text-primary underline" href={TIMER_URL} target="_blank" rel="noreferrer">
          Daily Focus Timer
        </a>
        . Visiting <span className="text-foreground">/timer</span> here sends you straight there.
      </div>
    </div>
  );
}
