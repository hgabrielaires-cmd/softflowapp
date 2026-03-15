
-- Correção 4: Add column to track if implantation was already paid externally
ALTER TABLE public.contratos_financeiros ADD COLUMN IF NOT EXISTS implantacao_ja_cobrada boolean NOT NULL DEFAULT false;

-- Add observacao column to parcelas_implantacao for tracking external payments
ALTER TABLE public.parcelas_implantacao ADD COLUMN IF NOT EXISTS observacao text;
