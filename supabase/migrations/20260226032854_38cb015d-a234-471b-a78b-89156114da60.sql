
-- Adicionar campos de controle ao card do painel
ALTER TABLE public.painel_atendimento
  ADD COLUMN aponta_tecnico_agenda BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN tipo_atendimento_local TEXT DEFAULT NULL,
  ADD COLUMN comentario TEXT DEFAULT NULL;
-- tipo_atendimento_local: 'interno', 'externo' ou NULL
