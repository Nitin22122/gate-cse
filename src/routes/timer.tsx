import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Brain,
  ChevronDown,
  Clock,
  Coffee,
  Info,
  Music,
  Music2,
  Pause,
  Play,
  PictureInPicture2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Settings,
  SkipForward,
  Siren,
  Volume2,
  Keyboard,
} from "lucide-react";
import { SettingsDialog, NumberInput } from "@/components/study/SettingsDialog";
import { SessionLog } from "@/components/study/SessionLog";
import { PopOut, usePopOut } from "@/components/study/PopOutTimer";
import { fmtClock, fmtDuration, useStudyTimer } from "@/lib/use-study-timer";
import { SOUNDS, type SoundId } from "@/lib/study-sound";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Focus Timer — Pomodoro Study Tracker" },
      {
        name: "description",
        content:
          "A dark-mode Pomodoro and simple study timer with subject tracking, daily focus targets, sound alerts and a time-wise session log.",
      },
      { property: "og:title", content: "Focus Timer — Pomodoro Study Tracker" },
      {
        property: "og:description",
        content: "Track study sessions, breaks and daily focus targets with a Pomodoro timer built for deep work.",
      },
    ],
  }),
  component: Index,
});

const SOUND_ICONS: Record<SoundId, typeof Music> = {
  chime: Music,
  bell: Bell,
  digital: Keyboard,
  arcade: Music2,
  alarm: Siren,
};

function Index() {
  const t = useStudyTimer();
  const { state } = t;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const popOut = usePopOut();
  const [fullscreen, setFullscreen] = useState(false);

  const enterFullscreen = async () => {
    setFullscreen(true);
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen may be blocked; overlay still shows */
    }
  };

  const exitFullscreen = () => {
    setFullscreen(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);



  const perCycle = Math.max(1, state.pomodorosPerSession);
  const phaseLabel =
    state.phase === "study"
      ? `Study Session #${(state.completedPomodoros % perCycle) + 1}`
      : state.phase === "short"
        ? "Short Break"
        : "Long Break";


  const topics = Object.entries(state.topics).sort((a, b) => b[1] - a[1]);
  const topicMax = topics[0]?.[1] ?? 1;

  return (
    <main className="min-h-screen px-4 py-5 md:px-8">
      <h1 className="sr-only">Focus Timer</h1>

      {/* Daily focus bar */}
      <div className="mb-5">
        <div className="flex items-end justify-between">
          <p className="label-xs text-primary">Daily Focus</p>
          <p className="label-xs text-muted-foreground">{state.dailyTargetHours}h</p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${t.progress * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* LEFT */}
        <div className="space-y-5">
          <section className="panel relative px-6 py-10 text-center">
            <div className="flex items-start justify-between">
              <p className="label-xs flex items-center gap-2 text-success">
                <span className="size-2 rounded-full bg-success" />
                {phaseLabel}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => (popOut.isOpen ? popOut.close() : void popOut.open())}
                  aria-label="Pop out timer"
                  title="Pop out timer (keeps running while you use other apps)"
                  className={`grid size-9 place-items-center rounded-full border transition-colors ${
                    popOut.isOpen
                      ? "border-accent/50 bg-accent/15 text-accent"
                      : "border-border bg-well text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <PictureInPicture2 className="size-4" />
                </button>
                <button
                  onClick={() => void enterFullscreen()}
                  aria-label="Fullscreen timer"
                  title="Fullscreen — show only the timer"
                  className="grid size-9 place-items-center rounded-full border border-border bg-well text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Maximize2 className="size-4" />
                </button>
                <button

                  onClick={() => setInfoOpen((v) => !v)}
                  aria-label="Info"
                  className="grid size-9 place-items-center rounded-full border border-border bg-well text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Info className="size-4" />
                </button>

                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Settings"
                  className="grid size-9 place-items-center rounded-full border border-primary/40 bg-primary/15 text-primary transition-colors hover:bg-primary/25"
                >
                  <Settings className="size-4" />
                </button>
              </div>
            </div>

            {infoOpen && (
              <p className="mx-auto mt-4 max-w-sm rounded-lg border border-border bg-well p-3 text-xs text-muted-foreground">
                Pomodoro mode counts down through study and break cycles. Simple timer counts up until you save the
                subject time.
              </p>
            )}

            <p className="text-gradient-timer mt-6 select-none font-sans text-7xl font-extrabold tabular-nums tracking-tight md:text-8xl">
              {fmtClock(t.displaySeconds).replace(":", " : ")}
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={t.toggle}
                className="flex min-w-52 items-center justify-center gap-2 rounded-xl bg-success px-8 py-4 text-base font-bold uppercase tracking-wide text-success-foreground transition-transform hover:scale-[1.02]"
              >
                {t.running ? <Pause className="size-5" /> : <Play className="size-5" />}
                {t.running ? "Pause" : "Start"}
              </button>
              <button
                onClick={t.skip}
                aria-label="Skip"
                className="grid size-14 place-items-center rounded-xl border border-border bg-well text-foreground/80 transition-colors hover:text-foreground"
              >
                <SkipForward className="size-5" />
              </button>
            </div>
          </section>

          <div className="grid grid-cols-3 gap-4">
            <Stat icon={<Clock className="size-5 text-info" />} value={fmtDuration(state.studiedToday)} label="Studied today" />
            <Stat icon={<Brain className="size-5 text-success" />} value={String(state.sessions)} label="Sessions" />
            <Stat icon={<Coffee className="size-5 text-warning" />} value={String(state.breaks)} label="Breaks" />
          </div>

          <section className="panel p-5">
            <header className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <span className="size-2 rounded-full bg-primary" />
                Today's Topics
              </h2>
              <p className="text-[11px] text-muted-foreground">Chart auto resets at midnight</p>
            </header>
            {topics.length === 0 ? (
              <p className="py-16 text-center text-sm italic text-muted-foreground">No study time logged yet today.</p>
            ) : (
              <ul className="space-y-4 py-5">
                {topics.map(([name, secs]) => (
                  <li key={name}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{name}</span>
                      <span className="font-mono text-muted-foreground">{fmtDuration(secs)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                        style={{ width: `${(secs / topicMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          <div className="panel grid grid-cols-2 gap-2 p-2">
            {(["simple", "pomodoro"] as const).map((m) => (
              <button
                key={m}
                onClick={() => t.update({ mode: m, elapsed: 0 })}
                className={`rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                  state.mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "simple" ? "Timer (Simple)" : "Pomodoro Mode"}
              </button>
            ))}
          </div>

          <section className="panel p-5">
            <div className="well p-4">
              <p className="label-xs text-muted-foreground">Current Study Subject</p>
              <div className="relative mt-3">
                <select
                  value={state.subject}
                  onChange={(e) => t.update({ subject: e.target.value })}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
                >
                  {state.subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={t.saveSubjectTime}
                className="rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-center transition-colors hover:bg-info/20"
              >
                <span className="flex items-center justify-center gap-2 text-sm font-bold text-info">
                  <Save className="size-4" /> Save Subject Time
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">(resets timer)</span>
              </button>
              <button
                onClick={t.reset}
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive transition-colors hover:bg-destructive/20"
              >
                <span className="flex items-center justify-center gap-2">
                  <RotateCcw className="size-4" /> Reset Timer
                </span>
              </button>
            </div>
          </section>

          <section className="panel p-5">
            <p className="label-xs text-primary">Pomodoro Cycles</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <p className="label-xs flex items-center gap-2 text-muted-foreground">
                  Study <span className="rounded bg-muted px-1.5 py-0.5 text-accent">(min)</span>
                </p>
                <div className="mt-2">
                  <NumberInput
                    value={state.durations.study}
                    min={1}
                    onChange={(v) => t.update({ durations: { ...state.durations, study: v } })}
                  />
                </div>
              </div>
              <div>
                <p className="label-xs text-muted-foreground">Short break</p>
                <div className="mt-2">
                  <NumberInput
                    value={state.durations.short}
                    min={1}
                    onChange={(v) => t.update({ durations: { ...state.durations, short: v } })}
                  />
                </div>
              </div>
              <div>
                <p className="label-xs text-muted-foreground">Long break</p>
                <div className="mt-2">
                  <NumberInput
                    value={state.durations.long}
                    min={1}
                    onChange={(v) => t.update({ durations: { ...state.durations, long: v } })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
              <p className="label-xs flex items-center gap-2 text-accent">
                <Volume2 className="size-4" /> Sound Settings
              </p>
              <button
                onClick={t.testSound}
                className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground/90 transition-colors hover:bg-secondary"
              >
                <Play className="size-3" /> Test Sound
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.volume}
              onChange={(e) => t.update({ volume: Number(e.target.value) })}
              aria-label="Volume"
              className="mt-4 w-full accent-[var(--accent)]"
            />

            <div className="mt-4 grid grid-cols-5 gap-2">
              {SOUNDS.map((s) => {
                const Icon = SOUND_ICONS[s.id];
                const active = state.sound === s.id;
                return (
                  <button
                    key={s.id}
                    aria-label={s.label}
                    onClick={() => t.update({ sound: s.id })}
                    className={`grid h-12 place-items-center rounded-xl border transition-colors ${
                      active
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-border bg-well text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-5" />
                  </button>
                );
              })}
            </div>
          </section>

          <SessionLog logs={state.logs} onClear={t.clearLogs} />
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={state}
        update={t.update}
      />

      <PopOut container={popOut.container}>
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background p-4 text-center">
          <p className="label-xs text-success">{phaseLabel}</p>
          <p className="text-gradient-timer select-none text-5xl font-extrabold tabular-nums">
            {fmtClock(t.displaySeconds)}
          </p>
          <p className="text-xs text-muted-foreground">{state.subject}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={t.toggle}
              className="flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-xs font-bold uppercase text-success-foreground"
            >
              {t.running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {t.running ? "Pause" : "Start"}
            </button>
            <button
              onClick={t.skip}
              aria-label="Skip"
              className="grid size-9 place-items-center rounded-lg border border-border bg-well text-foreground/80"
            >
              <SkipForward className="size-4" />
            </button>
          </div>
        </div>
      </PopOut>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
          <button
            onClick={exitFullscreen}
            aria-label="Exit fullscreen"
            title="Exit fullscreen (Esc)"
            className="absolute right-6 top-6 grid size-10 place-items-center rounded-full border border-border bg-well text-muted-foreground transition-colors hover:text-foreground"
          >
            <Minimize2 className="size-4" />
          </button>

          <p className="label-xs flex items-center gap-2 text-success">
            <span className="size-2 rounded-full bg-success" />
            {phaseLabel}
          </p>

          <p className="text-gradient-timer select-none font-sans text-[22vw] font-extrabold leading-none tabular-nums tracking-tight md:text-[16vw]">
            {fmtClock(t.displaySeconds)}
          </p>

          <p className="label-xs text-muted-foreground">{state.subject}</p>

          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={t.toggle}
              className="flex min-w-44 items-center justify-center gap-2 rounded-xl bg-success px-8 py-4 text-base font-bold uppercase tracking-wide text-success-foreground transition-transform hover:scale-[1.02]"
            >
              {t.running ? <Pause className="size-5" /> : <Play className="size-5" />}
              {t.running ? "Pause" : "Start"}
            </button>
            <button
              onClick={t.skip}
              aria-label="Skip"
              className="grid size-14 place-items-center rounded-xl border border-border bg-well text-foreground/80 transition-colors hover:text-foreground"
            >
              <SkipForward className="size-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}


function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-2 py-7">
      {icon}
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="label-xs text-muted-foreground">{label}</p>
    </div>
  );
}
