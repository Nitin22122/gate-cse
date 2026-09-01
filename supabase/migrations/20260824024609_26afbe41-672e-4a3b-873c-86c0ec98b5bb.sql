CREATE TABLE public.pyq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year integer NOT NULL DEFAULT 2024,
  paper text NOT NULL DEFAULT 'CS',
  subject text NOT NULL DEFAULT 'Algorithms',
  topic text NOT NULL DEFAULT 'Untagged',
  qtype text NOT NULL DEFAULT 'MCQ',
  marks numeric NOT NULL DEFAULT 1,
  question text NOT NULL,
  options text[] NOT NULL DEFAULT '{}'::text[],
  correct_index integer NOT NULL DEFAULT 0,
  answer_text text,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pyq_questions TO authenticated;
GRANT ALL ON public.pyq_questions TO service_role;

ALTER TABLE public.pyq_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read pyq bank" ON public.pyq_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own pyq" ON public.pyq_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own pyq" ON public.pyq_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own pyq" ON public.pyq_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER pyq_questions_updated BEFORE UPDATE ON public.pyq_questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX pyq_questions_filter_idx ON public.pyq_questions (year, subject, topic);

CREATE TABLE public.pyq_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES public.pyq_questions(id) ON DELETE CASCADE,
  selected_index integer,
  answer_text text,
  is_correct boolean NOT NULL DEFAULT false,
  skipped boolean NOT NULL DEFAULT false,
  time_taken_secs integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pyq_attempts TO authenticated;
GRANT ALL ON public.pyq_attempts TO service_role;

ALTER TABLE public.pyq_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pyq attempts" ON public.pyq_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);