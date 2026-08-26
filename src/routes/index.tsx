import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, NotebookPen, Target } from "lucide-react"; // ← REMOVED Timer import

import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import { supabase } from "@/integrations/supabase/client";
import { quoteOfTheDay } from "@/lib/constants"; // ← REMOVED TIMER_URL

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GATE 2027 Study Tracker — Plan, Track, Rank" },
      {
        name: "description",
        content:
          "A focused GATE 2027 preparation workspace: subject cards, lecture sessions, daily targets, study-hour analysis, journal and countdown.",
      },
      { property: "og:title", content: "GATE 2027 Study Tracker — Plan, Track, Rank" },
      {
        property: "og:description",
        content: "Subject cards, daily targets, study-hour analytics and journal for GATE 2027.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Target, title: "Today's Target", text: "Lectures scheduled for today, ticked off as you go." },
  { icon: BookOpen, title: "Subject Cards", text: "Teacher, source, dates and per-lecture progress." },
  { icon: BarChart3, title: "Hour Analysis", text: "Weekly, monthly and all-time subject breakdowns." },
  { icon: NotebookPen, title: "Daily Journal", text: "Reflect on each day and spot your patterns." },
];

function Landing() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="text-lg font-extrabold tracking-tight">
          GATE<span className="text-primary">2027</span>
        </span>
        <div className="flex gap-2">
          {/* REMOVED: Timer button from header - only show when logged in */}
          {signedIn ? (
            <>
              <Link to="/timer">
                <Button variant="ghost" size="sm">
                  <Timer className="mr-1.5 size-4" /> Focus Timer
                </Button>
              </Link>
              <Button size="sm" onClick={() => navigate({ to: "/dashboard" })}>
                Open dashboard
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </header>

      <section
        className="border-b border-border px-4 py-20 text-center"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          Your entire GATE 2027 prep, <span className="text-primary">in one place</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{quoteOfTheDay()}</p>
        <div className="mt-10">
          <Countdown examDate="2027-02-06" label="until GATE 2027 · Feb 6, 2027" />
        </div>
        <div className="mt-10 flex justify-center gap-3">
          <Link to={signedIn ? "/dashboard" : "/auth"}>
            <Button size="lg">{signedIn ? "Go to dashboard" : "Start tracking free"}</Button>
          </Link>
          {/* REMOVED: Timer button from hero section - only show when logged in */}
          {signedIn && (
            <Link to="/timer">
              <Button size="lg" variant="secondary">
                Open Focus Timer
              </Button>
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-16 md:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <f.icon className="size-6 text-primary" />
            <h2 className="mt-3 font-bold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        Built for the GATE 2027 grind. Stay consistent.
      </footer>
    </div>
  );
}