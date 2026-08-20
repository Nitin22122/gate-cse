import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Timer } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TIMER_URL } from "@/lib/constants";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/subjects", label: "Subjects" },
  { to: "/analysis", label: "Analysis" },
  { to: "/journal", label: "Journal" },
  { to: "/progress", label: "Progress & Mistakes" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="mr-2 text-lg font-extrabold tracking-tight">
            GATE<span className="text-primary">2027</span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-accent text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <a href={TIMER_URL} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm">
              <Timer className="mr-1.5 size-4" /> Focus Timer
            </Button>
          </a>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
