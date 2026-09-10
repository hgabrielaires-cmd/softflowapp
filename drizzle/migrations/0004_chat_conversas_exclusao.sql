ALTER TABLE public.chat_conversas
  ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS excluido_por UUID,
  ADD COLUMN IF NOT EXISTS excluido_motivo TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_conversas_excluido_em ON public.chat_conversas (excluido_em) WHERE excluido_em IS NOT NULL;