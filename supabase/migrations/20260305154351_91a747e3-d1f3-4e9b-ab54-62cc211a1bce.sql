
CREATE POLICY "Financeiro gerencia painel_checklist_progresso"
  ON public.painel_checklist_progresso
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

-- Drop the old SELECT-only policy
DROP POLICY IF EXISTS "Financeiro visualiza painel_checklist_progresso" ON public.painel_checklist_progresso;
