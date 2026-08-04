ALTER TABLE public.fin_plano_contas ADD COLUMN IF NOT EXISTS nao_valoriza_dre boolean NOT NULL DEFAULT false;

UPDATE public.fin_plano_contas
SET nao_valoriza_dre = true
WHERE nome ILIKE '%ajuste%'
   OR nome ILIKE '%transferencia%'
   OR nome ILIKE '%transferência%'
   OR nome ILIKE '%abertura%'
   OR nome ILIKE '%saldo inicial%';