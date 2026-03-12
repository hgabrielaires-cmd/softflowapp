
CREATE TABLE public.crm_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  oportunidade_id UUID NOT NULL REFERENCES public.crm_oportunidades(id) ON DELETE CASCADE,
  tipo_atendimento TEXT NOT NULL DEFAULT '',
  data_reuniao TIMESTAMP WITH TIME ZONE,
  descricao TEXT NOT NULL DEFAULT '',
  criado_por UUID NOT NULL,
  concluido_em TIMESTAMP WITH TIME ZONE,
  concluido_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage crm_tarefas"
  ON public.crm_tarefas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_crm_tarefas_updated_at
  BEFORE UPDATE ON public.crm_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
