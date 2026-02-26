
-- Add pause columns to painel_atendimento
ALTER TABLE public.painel_atendimento 
  ADD COLUMN pausado boolean NOT NULL DEFAULT false,
  ADD COLUMN pausado_em timestamp with time zone,
  ADD COLUMN pausado_por uuid,
  ADD COLUMN pausado_motivo text;
