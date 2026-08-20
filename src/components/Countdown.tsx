import { useEffect, useState } from "react";

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(ms / 86400000),
    hrs: Math.floor((ms / 3600000) % 24),
    min: Math.floor((ms / 60000) % 60),
    sec: Math.floor((ms / 1000) % 60),
  };
}

export function Countdown({ examDate, label }: { examDate: string; label?: string }) {
  const target = new Date(`${examDate}T00:00:00`);
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(new Date(`${examDate}T00:00:00`))), 1000);
    return () => clearInterval(id);
  }, [examDate]);

  const cells: [number, string][] = [
    [t.days, "DAYS"],
    [t.hrs, "HRS"],
    [t.min, "MIN"],
    [t.sec, "SEC"],
  ];

  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-6">
        {cells.map(([value, unit]) => (
          <div key={unit}>
            <div className="text-4xl font-extrabold tabular-nums tracking-tight text-primary md:text-5xl">
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
              {unit}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {label ?? `until GATE · ${new Date(`${examDate}T00:00:00`).toDateString()}`}
      </p>
    </div>
  );
}
