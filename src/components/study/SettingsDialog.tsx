import { Settings as SettingsIcon, X } from "lucide-react";
import type { StudyState } from "@/lib/use-study-timer";

export function SettingsDialog({
  open,
  onClose,
  state,
  update,
}: {
  open: boolean;
  onClose: () => void;
  state: StudyState;
  update: (patch: Partial<StudyState>) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div className="panel relative w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <SettingsIcon className="size-5 text-muted-foreground" />
            Settings
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-well p-5">
          <h3 className="text-base font-semibold">Preferences</h3>
          <label className="mt-3 flex items-center justify-between border-b border-border pb-4 text-sm">
            <span className="text-foreground/90">Auto-start next session</span>
            <input
              type="checkbox"
              checked={state.autoStart}
              onChange={(e) => update({ autoStart: e.target.checked })}
              className="size-5 accent-[var(--primary)]"
            />
          </label>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Field label="POMODOROS / SESSION" tone="primary">
              <NumberInput
                value={state.pomodorosPerSession}
                min={1}
                onChange={(v) => update({ pomodorosPerSession: v })}
              />
            </Field>
            <Field label="DAILY TARGET (HRS)" tone="accent">
              <NumberInput value={state.dailyTargetHours} min={1} onChange={(v) => update({ dailyTargetHours: v })} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "primary" | "accent";
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={`label-xs ${tone === "primary" ? "text-primary" : "text-accent"}`}>{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
      className="w-full rounded-lg border border-border bg-well px-4 py-3 text-lg font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
    />
  );
}
