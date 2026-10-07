CREATE POLICY "pyq images readable by signed in users"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pyq-images');

CREATE POLICY "pyq images upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pyq-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pyq images update own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pyq-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'pyq-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pyq images delete own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pyq-images' AND (storage.foldername(name))[1] = auth.uid()::text);