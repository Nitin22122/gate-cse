CREATE TABLE public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  kind text not null default 'Notes',
  file_path text not null,
  file_name text not null,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_materials TO authenticated;
GRANT ALL ON public.study_materials TO service_role;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own materials" ON public.study_materials FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own material files read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own material files insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own material files delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'study-materials' AND auth.uid()::text = (storage.foldername(name))[1]);