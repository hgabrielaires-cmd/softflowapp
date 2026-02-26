
-- Table to store checklist execution progress per card per activity
CREATE TABLE public.painel_checklist_progresso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  atividade_id UUID NOT NULL REFERENCES public.jornada_atividades(id) ON DELETE CASCADE,
  checklist_index INTEGER NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  valor_texto TEXT,
  valor_data TIMESTAMP WITH TIME ZONE,
  concluido_por UUID,
  concluido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, atividade_id, checklist_index)
);

ALTER TABLE public.painel_checklist_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Operacional gerencia painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR ALL
  USING (has_role(auth.uid(), 'operacional'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Tecnico gerencia painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR ALL
  USING (has_role(auth.uid(), 'tecnico'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tecnico'::app_role));

CREATE TRIGGER update_painel_checklist_progresso_updated_at
  BEFORE UPDATE ON public.painel_checklist_progresso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
