
-- Allow authenticated users to delete apontamentos (permission is checked at app level)
CREATE POLICY "Autenticados deletam apontamentos"
ON public.painel_apontamentos
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);
