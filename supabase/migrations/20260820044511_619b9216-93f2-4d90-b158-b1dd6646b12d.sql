ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS stream text NOT NULL DEFAULT 'GATE',
  ADD COLUMN IF NOT EXISTS target_branch text NOT NULL DEFAULT 'CS',
  ADD COLUMN IF NOT EXISTS about_me text,
  ADD COLUMN IF NOT EXISTS social_links text;

CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  organization text NOT NULL DEFAULT 'GO Classes (Gate CS 2027)',
  test_type text NOT NULL DEFAULT 'Topic Test',
  category text,
  attempted boolean NOT NULL DEFAULT false,
  score numeric,
  max_score numeric,
  actual_time_mins integer,
  analysis_time_mins integer,
  test_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tests" ON public.tests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tests_updated BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.syllabus_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track text NOT NULL DEFAULT 'CS',
  section text NOT NULL,
  topic text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_topics TO authenticated;
GRANT ALL ON public.syllabus_topics TO service_role;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own syllabus" ON public.syllabus_topics FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER syllabus_updated BEFORE UPDATE ON public.syllabus_topics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();