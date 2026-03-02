
-- Add metadata column to notificacoes for storing card_id, comentario_id, etc.
ALTER TABLE public.notificacoes ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
