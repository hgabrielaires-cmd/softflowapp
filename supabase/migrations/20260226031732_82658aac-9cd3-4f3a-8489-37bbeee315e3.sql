
-- Tabela para armazenar agendamentos do checklist do painel
CREATE TABLE public.painel_agendamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  atividade_id UUID NOT NULL REFERENCES public.jornada_atividades(id),
  checklist_index INTEGER NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  observacao TEXT,
  criado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.painel_agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agendamentos" ON public.painel_agendamentos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert agendamentos" ON public.painel_agendamentos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update agendamentos" ON public.painel_agendamentos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete agendamentos" ON public.painel_agendamentos
  FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_painel_agendamentos_card ON public.painel_agendamentos(card_id);
CREATE INDEX idx_painel_agendamentos_data ON public.painel_agendamentos(data);
