import { useEffect, useState } from "react";

type CountdownProps = {
  examDate: string;
  label?: string;
};

type CountdownTime = {
  days: number;
  hrs: number;
  min: number;
  sec: number;
};

function diff(target: Date): CountdownTime {
  const ms = Math.max(0, target.getTime() - Date.now());

  return {
    days: Math.floor(ms / 86400000),
    hrs: Math.floor((ms / 3600000) % 24),
    min: Math.floor((ms / 60000) % 60),
    sec: Math.floor((ms / 1000) % 60),
  };
}

export function Countdown({ examDate, label }: CountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<CountdownTime>({
    days: 0,
    hrs: 0,
    min: 0,
    sec: 0,
  });

  useEffect(() => {
    setMounted(true);

    const target = new Date(`${examDate}T00:00:00`);

    const updateCountdown = () => {
      setTime(diff(target));
    };

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [examDate]);

  const cells: [number, string][] = [
    [time.days, "DAYS"],
    [time.hrs, "HRS"],
    [time.min, "MIN"],
    [time.sec, "SEC"],
  ];

  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-6">
        {cells.map(([value, unit]) => (
          <div key={unit}>
            <div className="text-4xl font-extrabold tabular-nums tracking-tight text-primary md:text-5xl">
              {mounted ? String(value).padStart(2, "0") : "--"}
            </div>

            <div className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
              {unit}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {label ?? `until GATE · ${examDate}`}
      </p>
    </div>
  );
}