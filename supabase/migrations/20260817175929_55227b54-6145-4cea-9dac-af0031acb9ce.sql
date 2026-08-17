CREATE POLICY "Autenticados podem ler boletos sicredi"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'sicredi-boletos');