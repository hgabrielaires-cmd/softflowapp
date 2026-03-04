
-- Add cor column to mesas_atendimento
ALTER TABLE public.mesas_atendimento ADD COLUMN IF NOT EXISTS cor text DEFAULT NULL;

-- Add new columns to painel_agendamentos for mesa/event tracking
ALTER TABLE public.painel_agendamentos ADD COLUMN IF NOT EXISTS mesa_id uuid REFERENCES public.mesas_atendimento(id) DEFAULT NULL;
ALTER TABLE public.painel_agendamentos ADD COLUMN IF NOT EXISTS filial_id uuid REFERENCES public.filiais(id) DEFAULT NULL;
ALTER TABLE public.painel_agendamentos ADD COLUMN IF NOT EXISTS etapa_id uuid REFERENCES public.painel_etapas(id) DEFAULT NULL;
ALTER TABLE public.painel_agendamentos ADD COLUMN IF NOT EXISTS titulo text DEFAULT NULL;
ALTER TABLE public.painel_agendamentos ADD COLUMN IF NOT EXISTS cor_evento text DEFAULT NULL;

-- Index for mesa_id lookups
CREATE INDEX IF NOT EXISTS idx_painel_agendamentos_mesa_id ON public.painel_agendamentos(mesa_id);
CREATE INDEX IF NOT EXISTS idx_painel_agendamentos_filial_id ON public.painel_agendamentos(filial_id);
