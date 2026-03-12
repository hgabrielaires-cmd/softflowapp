
DROP POLICY "Authenticated users can manage crm_tarefas" ON public.crm_tarefas;

CREATE POLICY "Authenticated users can select crm_tarefas"
  ON public.crm_tarefas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert crm_tarefas"
  ON public.crm_tarefas FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid());

CREATE POLICY "Authenticated users can update crm_tarefas"
  ON public.crm_tarefas FOR UPDATE TO authenticated USING (criado_por = auth.uid());

CREATE POLICY "Authenticated users can delete crm_tarefas"
  ON public.crm_tarefas FOR DELETE TO authenticated USING (criado_por = auth.uid());
