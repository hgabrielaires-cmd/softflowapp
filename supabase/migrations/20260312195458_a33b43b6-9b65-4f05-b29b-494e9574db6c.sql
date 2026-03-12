
CREATE TABLE public.crm_tarefas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid REFERENCES public.crm_tarefas(id) ON DELETE CASCADE NOT NULL,
  resposta text NOT NULL,
  data_anterior timestamptz,
  data_nova timestamptz,
  tipo text NOT NULL DEFAULT 'adiamento',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_tarefas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage task history"
  ON public.crm_tarefas_historico
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
