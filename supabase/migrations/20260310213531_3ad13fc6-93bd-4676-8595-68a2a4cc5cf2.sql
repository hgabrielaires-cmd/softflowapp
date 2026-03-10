
-- Add etapa_execucao_id to painel_agendamentos to distinguish creation stage from execution stage
ALTER TABLE public.painel_agendamentos
ADD COLUMN IF NOT EXISTS etapa_execucao_id UUID REFERENCES public.painel_etapas(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.painel_agendamentos.etapa_execucao_id IS 'Etapa where this agenda item should be executed (may differ from creation etapa)';
COMMENT ON COLUMN public.painel_agendamentos.etapa_id IS 'Etapa where this agenda item was created';
