
-- Tabela para guardar histórico de passagem por cada etapa
CREATE TABLE public.painel_historico_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  etapa_id UUID NOT NULL REFERENCES public.painel_etapas(id),
  etapa_nome TEXT NOT NULL,
  entrada_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  saida_em TIMESTAMP WITH TIME ZONE,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.painel_historico_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view historico" ON public.painel_historico_etapas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert historico" ON public.painel_historico_etapas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update historico" ON public.painel_historico_etapas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_painel_historico_card_id ON public.painel_historico_etapas(card_id);
CREATE INDEX idx_painel_historico_etapa_id ON public.painel_historico_etapas(etapa_id);
