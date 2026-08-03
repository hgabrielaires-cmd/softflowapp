CREATE POLICY "Financeiro pode ver anexos de despesas" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'financeiro-anexos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor')));

CREATE POLICY "Financeiro pode enviar anexos de despesas" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financeiro-anexos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor')));

CREATE POLICY "Financeiro pode excluir anexos de despesas" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'financeiro-anexos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro')));