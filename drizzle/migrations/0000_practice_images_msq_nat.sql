ALTER TABLE public.practice_questions
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS correct_indices integer[],
  ADD COLUMN IF NOT EXISTS nat_answer text;
ALTER TABLE public.practice_attempts
  ADD COLUMN IF NOT EXISTS selected_indices integer[],
  ADD COLUMN IF NOT EXISTS nat_input text;