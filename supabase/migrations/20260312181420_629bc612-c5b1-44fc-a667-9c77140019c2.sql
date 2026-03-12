ALTER TABLE public.crm_oportunidades
  ADD COLUMN IF NOT EXISTS desconto_implantacao numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_implantacao_tipo text NOT NULL DEFAULT 'R$',
  ADD COLUMN IF NOT EXISTS desconto_mensalidade numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_mensalidade_tipo text NOT NULL DEFAULT 'R$';