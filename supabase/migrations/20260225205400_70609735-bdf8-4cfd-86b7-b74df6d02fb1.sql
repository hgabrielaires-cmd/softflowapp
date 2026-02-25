
ALTER TABLE public.painel_atendimento
  ADD COLUMN iniciado_em timestamp with time zone NULL,
  ADD COLUMN iniciado_por uuid NULL;
