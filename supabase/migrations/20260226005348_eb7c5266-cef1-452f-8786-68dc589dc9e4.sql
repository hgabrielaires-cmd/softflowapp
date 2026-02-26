-- Registra alertas de SLA já processados para evitar reenvio duplicado
CREATE TABLE IF NOT EXISTS public.painel_alertas_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  alerta_id UUID NOT NULL REFERENCES public.painel_etapa_alertas(id) ON DELETE CASCADE,
  canal TEXT NOT NULL,
  nivel INTEGER NOT NULL,
  enviado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(card_id, alerta_id)
);

ALTER TABLE public.painel_alertas_enviados ENABLE ROW LEVEL SECURITY;

-- Apenas administradores podem visualizar/gerenciar histórico de alertas enviados
DROP POLICY IF EXISTS "Admin gerencia painel_alertas_enviados" ON public.painel_alertas_enviados;
CREATE POLICY "Admin gerencia painel_alertas_enviados"
ON public.painel_alertas_enviados
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_painel_alertas_enviados_card_alerta
  ON public.painel_alertas_enviados(card_id, alerta_id);

CREATE INDEX IF NOT EXISTS idx_painel_alertas_enviados_enviado_em
  ON public.painel_alertas_enviados(enviado_em DESC);