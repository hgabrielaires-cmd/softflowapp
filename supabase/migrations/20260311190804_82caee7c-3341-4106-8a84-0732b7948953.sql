CREATE POLICY "Autenticados visualizam contratos_cancelados"
ON public.contratos_cancelados
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);