import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSound, type SoundId } from "./study-sound";

export type Mode = "simple" | "pomodoro";
export type Phase = "study" | "short" | "long";

export type LogEntry = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  subject: string;
  type: "Study Session" | "Short Break" | "Long Break";
  seconds: number;
};

export type StudyState = {
  day: string;
  mode: Mode;
  phase: Phase;
  elapsed: number;
  subject: string;
  subjects: string[];
  durations: { study: number; short: number; long: number };
  pomodorosPerSession: number;
  dailyTargetHours: number;
  autoStart: boolean;
  volume: number;
  sound: SoundId;
  studiedToday: number;
  sessions: number;
  breaks: number;
  topics: Record<string, number>;
  logs: LogEntry[];
  completedPomodoros: number;
};

const KEY = "focus-timer-state-v1";

const today = () => new Date().toISOString().slice(0, 10);

const initial: StudyState = {
  day: today(),
  mode: "pomodoro",
  phase: "study",
  elapsed: 0,
  subject: "General",
  subjects: ["Algorithms", "Engineering Mathematics", "Discrete Mathematics", "Data Structures", "C Programming", "Databases", "Compiler Design", "Theory Of Computation", "Operating System", "Computer Network", "General Aptitude", "Computer Organization & Architecture", "Digital Logic", "General"],
  durations: { study: 50, short: 1, long: 20 },
  pomodorosPerSession: 3,
  dailyTargetHours: 6,
  autoStart: false,
  volume: 0.6,
  sound: "chime",
  studiedToday: 0,
  sessions: 0,
  breaks: 0,
  topics: {},
  logs: [],
  completedPomodoros: 0,
};

function resetDaily(s: StudyState): StudyState {
  if (s.day === today()) return s;
  return { ...s, day: today(), studiedToday: 0, sessions: 0, breaks: 0, topics: {}, logs: [], completedPomodoros: 0 };
}

export function useStudyTimer() {
  const [state, setState] = useState<StudyState>(initial);
  const [running, setRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const activeLog = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(resetDaily({ ...initial, ...(JSON.parse(raw) as StudyState), elapsed: 0 }));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const phaseSeconds = (s: StudyState) =>
    (s.phase === "study" ? s.durations.study : s.phase === "short" ? s.durations.short : s.durations.long) * 60;

  const logType = (phase: Phase): LogEntry["type"] =>
    phase === "study" ? "Study Session" : phase === "short" ? "Short Break" : "Long Break";

  const openLog = useCallback((s: StudyState): StudyState => {
    const id = `${Date.now()}`;
    activeLog.current = id;
    const subject = s.subject || s.subjects[0] || "Study";
    return {
      ...s,
      logs: [
        { id, startedAt: Date.now(), endedAt: null, subject, type: logType(s.phase), seconds: 0 },
        ...s.logs,
      ],
    };
  }, []);

  const closeLog = useCallback((s: StudyState): StudyState => {
    if (!activeLog.current) return s;
    const id = activeLog.current;
    activeLog.current = null;
    return { ...s, logs: s.logs.map((l) => (l.id === id ? { ...l, endedAt: Date.now() } : l)) };
  }, []);

  const tick = useCallback(() => {
    setState((s) => {
      let next: StudyState = { ...s, elapsed: s.elapsed + 1 };
      if (s.phase === "study") {
        next.studiedToday = s.studiedToday + 1;
        next.topics = { ...s.topics, [s.subject]: (s.topics[s.subject] ?? 0) + 1 };
      }
      if (activeLog.current) {
        const id = activeLog.current;
        next.logs = next.logs.map((l) =>
          l.id === id
            ? { ...l, seconds: l.seconds + 1, subject: l.type === "Study Session" ? s.subject : l.subject }
            : l,
        );
      }

      if (s.mode === "pomodoro" && next.elapsed >= phaseSeconds(s)) {
        playSound(s.sound, s.volume);
        next = closeLog(next);
        next.elapsed = 0;
        if (s.phase === "study") {
          const completed = s.completedPomodoros + 1;
          const perCycle = Math.max(1, s.pomodorosPerSession);
          next.sessions = s.sessions + 1;
          if (completed % perCycle === 0) {
            next.completedPomodoros = 0;
            next.phase = "long";
          } else {
            next.completedPomodoros = completed;
            next.phase = "short";
          }
        } else {
          next.breaks = s.breaks + 1;
          next.phase = "study";
        }
        if (s.autoStart) {
          next = openLog(next);
        } else {
          setRunning(false);
        }
      }
      return next;
    });
  }, [closeLog, openLog]);

  useEffect(() => {
    if (!running) return;
    let last = Date.now();
    const step = () => {
      const now = Date.now();
      // Catch up on seconds missed while the tab was backgrounded/throttled.
      let missed = Math.floor((now - last) / 1000);
      if (missed <= 0) return;
      if (missed > 6 * 3600) missed = 6 * 3600;
      last += missed * 1000;
      for (let i = 0; i < missed; i++) tick();
    };
    const i = window.setInterval(step, 1000);
    const onVisible = () => step();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(i);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [running, tick]);


  const toggle = useCallback(() => {
    setRunning((r) => {
      if (r) {
        setState((s) => closeLog(s));
        return false;
      }
      setState((s) => (activeLog.current ? s : openLog(s)));
      return true;
    });
  }, [closeLog, openLog]);

  const skip = useCallback(() => {
    setState((s) => {
      let next = closeLog(s);
      next.elapsed = 0;
      if (s.phase === "study") {
        const completed = s.completedPomodoros + 1;
        const perCycle = Math.max(1, s.pomodorosPerSession);
        next.sessions = s.sessions + 1;
        if (completed % perCycle === 0) {
          next.completedPomodoros = 0;
          next.phase = "long";
        } else {
          next.completedPomodoros = completed;
          next.phase = "short";
        }
      } else {
        next.breaks = s.breaks + 1;
        next.phase = "study";
      }
      if (running) next = openLog(next);
      return next;
    });
  }, [closeLog, openLog, running]);

  const reset = useCallback(() => {
    setRunning(false);
    setState((s) => ({ ...closeLog(s), elapsed: 0, phase: "study" }));
  }, [closeLog]);

  const saveSubjectTime = useCallback(() => {
    setRunning(false);
    setState((s) => ({ ...closeLog(s), elapsed: 0 }));
  }, [closeLog]);

  const clearLogs = useCallback(() => setState((s) => ({ ...s, logs: [] })), []);

  const update = useCallback((patch: Partial<StudyState>) => {
    setState((s) => {
      const next = { ...s, ...patch };
      if (patch.subject && activeLog.current) {
        const id = activeLog.current;
        next.logs = next.logs.map((l) =>
          l.id === id && l.type === "Study Session" ? { ...l, subject: patch.subject! } : l,
        );
      }
      return next;
    });
  }, []);

  const displaySeconds = useMemo(
    () => (state.mode === "pomodoro" ? Math.max(0, phaseSeconds(state) - state.elapsed) : state.elapsed),
    [state],
  );

  const progress = useMemo(() => {
    const target = state.dailyTargetHours * 3600;
    return target > 0 ? Math.min(1, state.studiedToday / target) : 0;
  }, [state.dailyTargetHours, state.studiedToday]);

  return {
    state,
    running,
    hydrated,
    displaySeconds,
    progress,
    toggle,
    skip,
    reset,
    saveSubjectTime,
    clearLogs,
    update,
    testSound: () => playSound(state.sound, state.volume),
  };
}

export function fmtClock(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function fmtLong(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function fmtDuration(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}
