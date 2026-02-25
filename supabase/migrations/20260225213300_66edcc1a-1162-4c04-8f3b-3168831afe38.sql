
-- Create table for multi-level alerts per stage
CREATE TABLE public.painel_etapa_alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id UUID NOT NULL REFERENCES public.painel_etapas(id) ON DELETE CASCADE,
  canal TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp' or 'notificacao'
  nivel INTEGER NOT NULL DEFAULT 1, -- 1, 2 or 3
  template_id UUID REFERENCES public.message_templates(id),
  usuario_id UUID REFERENCES public.profiles(id),
  horas_apos_sla NUMERIC NOT NULL DEFAULT 0, -- hours after SLA exceeded to trigger
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(etapa_id, canal, nivel)
);

ALTER TABLE public.painel_etapa_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia painel_etapa_alertas"
  ON public.painel_etapa_alertas FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam painel_etapa_alertas"
  ON public.painel_etapa_alertas FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_painel_etapa_alertas_updated_at
  BEFORE UPDATE ON public.painel_etapa_alertas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
