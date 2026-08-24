import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  Brain,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  NotebookPen,
  Timer,
  TriangleAlert,
  User,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TIMER_URL } from "@/lib/constants";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/syllabus", label: "Syllabus", icon: ListChecks },
  { to: "/tests", label: "Tests", icon: ClipboardList },
  { to: "/analysis", label: "Analysis", icon: BarChart3 },
  { to: "/practice", label: "Practice Arena", icon: Brain },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/progress", label: "Mistakes", icon: TriangleAlert },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link
        to="/dashboard"
        onClick={() => setOpen(false)}
        className="px-2 text-lg font-extrabold tracking-tight"
      >
        GATE<span className="text-primary">2027</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-foreground font-semibold" }}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-2 border-t border-border pt-3">
        <a href={TIMER_URL} target="_blank" rel="noreferrer" className="block">
          <Button variant="secondary" size="sm" className="w-full justify-start">
            <Timer className="mr-2 size-4" /> Focus Timer
          </Button>
        </a>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 size-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border bg-card lg:block">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          <Menu className="size-5" />
        </Button>
        <Link to="/dashboard" className="text-lg font-extrabold tracking-tight">
          GATE<span className="text-primary">2027</span>
        </Link>
      </header>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-card lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <main className="px-4 py-8 lg:pl-64">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
