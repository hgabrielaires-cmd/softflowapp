
ALTER TABLE public.painel_historico_etapas
ADD COLUMN sla_cumprido boolean DEFAULT NULL;

COMMENT ON COLUMN public.painel_historico_etapas.sla_cumprido IS 'true = SLA cumprido (tempo real <= previsto), false = SLA não cumprido, null = sem SLA configurado';
