-- Change FK constraints on painel_agendamentos and painel_checklist_progresso 
-- to SET NULL on delete, so deleting old jornada_atividades doesn't cascade-delete operational data

ALTER TABLE public.painel_agendamentos
  DROP CONSTRAINT painel_agendamentos_atividade_id_fkey,
  ADD CONSTRAINT painel_agendamentos_atividade_id_fkey
    FOREIGN KEY (atividade_id) REFERENCES public.jornada_atividades(id) ON DELETE SET NULL;

ALTER TABLE public.painel_agendamentos
  ALTER COLUMN atividade_id DROP NOT NULL;

ALTER TABLE public.painel_checklist_progresso
  DROP CONSTRAINT painel_checklist_progresso_atividade_id_fkey,
  ADD CONSTRAINT painel_checklist_progresso_atividade_id_fkey
    FOREIGN KEY (atividade_id) REFERENCES public.jornada_atividades(id) ON DELETE SET NULL;

ALTER TABLE public.painel_checklist_progresso
  ALTER COLUMN atividade_id DROP NOT NULL;