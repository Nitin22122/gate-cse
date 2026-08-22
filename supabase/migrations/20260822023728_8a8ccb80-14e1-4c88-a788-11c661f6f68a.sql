CREATE TABLE public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  completed boolean not null default false,
  due_date date not null default CURRENT_DATE,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.streak_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null default CURRENT_DATE,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
GRANT SELECT, INSERT, DELETE ON public.streak_days TO authenticated;
GRANT ALL ON public.streak_days TO service_role;
ALTER TABLE public.streak_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own streak" ON public.streak_days FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);