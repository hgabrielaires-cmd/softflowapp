
-- Add SLA tracking columns to history
ALTER TABLE public.painel_historico_etapas
ADD COLUMN sla_previsto_horas numeric DEFAULT NULL,
ADD COLUMN tempo_real_horas numeric DEFAULT NULL;
