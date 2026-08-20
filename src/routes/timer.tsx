import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { TIMER_URL } from "@/lib/constants";

export const Route = createFileRoute("/timer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Focus Timer — GATE 2027 Study Tracker" },
      { name: "description", content: "Redirecting you to the Daily Focus Timer app." },
      { property: "og:title", content: "Focus Timer — GATE 2027 Study Tracker" },
      { property: "og:description", content: "Redirecting you to the Daily Focus Timer app." },
    ],
  }),
  component: TimerRedirect,
});

function TimerRedirect() {
  useEffect(() => {
    window.location.replace(TIMER_URL);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">Opening your Focus Timer…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If nothing happens,{" "}
          <a className="text-primary underline" href={TIMER_URL}>
            click here
          </a>
          .
        </p>
      </div>
    </div>
  );
}
