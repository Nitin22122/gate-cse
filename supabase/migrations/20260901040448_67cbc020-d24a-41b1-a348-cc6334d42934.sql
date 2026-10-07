ALTER TABLE public.pyq_questions
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS correct_indices integer[] NOT NULL DEFAULT '{}'::integer[];

ALTER TABLE public.pyq_attempts
  ADD COLUMN IF NOT EXISTS selected_indices integer[] NOT NULL DEFAULT '{}'::integer[];