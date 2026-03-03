
-- Fix painel_apontamentos: change "Autenticados gerenciam apontamentos" from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Autenticados gerenciam apontamentos" ON public.painel_apontamentos;
CREATE POLICY "Autenticados gerenciam apontamentos"
  ON public.painel_apontamentos
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix painel_agendamentos: same issue
DROP POLICY IF EXISTS "Autenticados gerenciam agendamentos" ON public.painel_agendamentos;
CREATE POLICY "Autenticados gerenciam agendamentos"
  ON public.painel_agendamentos
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
