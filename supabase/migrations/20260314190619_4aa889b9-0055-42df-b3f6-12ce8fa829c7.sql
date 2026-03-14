-- Tabela de configuração Asaas por filial
CREATE TABLE IF NOT EXISTS public.asaas_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  ambiente TEXT NOT NULL DEFAULT 'sandbox',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(filial_id)
);

ALTER TABLE public.asaas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read asaas_config" ON public.asaas_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can manage asaas_config" ON public.asaas_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_asaas_config_filial ON public.asaas_config(filial_id);