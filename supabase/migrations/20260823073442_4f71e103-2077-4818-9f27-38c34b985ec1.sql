GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_questions TO authenticated;
GRANT ALL ON public.practice_questions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_attempts TO authenticated;
GRANT ALL ON public.practice_attempts TO service_role;
GRANT EXECUTE ON FUNCTION public.practice_leaderboard() TO authenticated;