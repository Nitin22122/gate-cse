import { Clock, Trash2 } from "lucide-react";
import { fmtLong, type LogEntry } from "@/lib/use-study-timer";

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export function SessionLog({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  return (
    <section className="panel p-5">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Clock className="size-4 text-muted-foreground" />
          Time-Wise Session Log
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {logs.length}
          </span>
        </h2>
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/25"
        >
          <Trash2 className="size-3.5" />
          Clear Logs
        </button>
      </header>

      <table className="w-full text-sm">
        <thead>
          <tr className="label-xs text-muted-foreground">
            <th className="py-3 text-left font-bold">Start – End</th>
            <th className="py-3 text-left font-bold">Subject</th>
            <th className="py-3 text-left font-bold">Type</th>
            <th className="py-3 text-right font-bold">Duration</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-sm italic text-muted-foreground">
                No sessions logged yet.
              </td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l.id} className="border-t border-border/60">
                <td className="py-3 text-muted-foreground">
                  {time(l.startedAt)} –{" "}
                  {l.endedAt ? (
                    time(l.endedAt)
                  ) : (
                    <span className="font-semibold text-success">now</span>
                  )}
                </td>
                <td className="py-3 font-bold">{l.subject}</td>
                <td className="py-3 text-foreground/80">{l.type}</td>
                <td className="py-3 text-right font-mono text-success">{fmtLong(l.seconds)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
