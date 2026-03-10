
-- Tabela de execução individual de atividades no painel de atendimento
CREATE TABLE public.painel_atividade_execucao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  atividade_id UUID NOT NULL REFERENCES public.jornada_atividades(id) ON DELETE SET NULL,
  etapa_id UUID REFERENCES public.painel_etapas(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  iniciado_em TIMESTAMP WITH TIME ZONE,
  iniciado_por UUID,
  concluido_em TIMESTAMP WITH TIME ZONE,
  concluido_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, atividade_id)
);

-- RLS
ALTER TABLE public.painel_atividade_execucao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam execucao atividades"
  ON public.painel_atividade_execucao
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Filial filter painel_atividade_execucao"
  ON public.painel_atividade_execucao
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.painel_atendimento pa
      WHERE pa.id = painel_atividade_execucao.card_id
        AND public.user_has_filial_access(pa.filial_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.painel_atendimento pa
      WHERE pa.id = painel_atividade_execucao.card_id
        AND public.user_has_filial_access(pa.filial_id)
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.painel_atividade_execucao;
