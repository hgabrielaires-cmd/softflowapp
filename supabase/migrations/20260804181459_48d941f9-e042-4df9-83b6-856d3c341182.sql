ALTER TABLE public.telegram_memoria ADD COLUMN IF NOT EXISTS observacao_chave text;
CREATE INDEX IF NOT EXISTS idx_telegram_memoria_obs ON public.telegram_memoria(observacao_chave);