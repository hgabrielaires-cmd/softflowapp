
-- Add column to track start delay in stage history
ALTER TABLE public.painel_historico_etapas
ADD COLUMN atraso_inicio_horas numeric DEFAULT NULL;

COMMENT ON COLUMN public.painel_historico_etapas.atraso_inicio_horas IS 'Hours of delay between entering the stage and actually starting it (clicking Iniciar). NULL means no delay or not yet started.';
