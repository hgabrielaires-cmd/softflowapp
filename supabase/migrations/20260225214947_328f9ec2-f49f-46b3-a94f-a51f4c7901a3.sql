
-- Add filial_id to painel_etapa_alertas for per-branch alert config
ALTER TABLE public.painel_etapa_alertas
  ADD COLUMN filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_painel_etapa_alertas_filial ON public.painel_etapa_alertas(filial_id);

-- Update unique constraint: same etapa + canal + nivel + filial should be unique
CREATE UNIQUE INDEX idx_etapa_alerta_unique ON public.painel_etapa_alertas(etapa_id, canal, nivel, filial_id) WHERE filial_id IS NOT NULL;
CREATE UNIQUE INDEX idx_etapa_alerta_unique_null_filial ON public.painel_etapa_alertas(etapa_id, canal, nivel) WHERE filial_id IS NULL;
