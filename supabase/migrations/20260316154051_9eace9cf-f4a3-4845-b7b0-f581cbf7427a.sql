
-- Add new columns to crm_oportunidades for perdido flow
ALTER TABLE public.crm_oportunidades
  ADD COLUMN IF NOT EXISTS motivo_perda_id UUID REFERENCES public.crm_motivos_perda(id),
  ADD COLUMN IF NOT EXISTS concorrente TEXT,
  ADD COLUMN IF NOT EXISTS observacao_perda TEXT,
  ADD COLUMN IF NOT EXISTS data_perda TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS etapa_perda_id UUID REFERENCES public.crm_etapas(id);

-- Create crm_historico table
CREATE TABLE IF NOT EXISTS public.crm_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id UUID NOT NULL REFERENCES public.crm_oportunidades(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'status_alterado',
  descricao TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_historico ENABLE ROW LEVEL SECURITY;

-- RLS policies for crm_historico
CREATE POLICY "Authenticated users can read crm_historico" ON public.crm_historico
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert crm_historico" ON public.crm_historico
  FOR INSERT TO authenticated WITH CHECK (true);
