
-- 1) Adicionar campos de precificação em planos
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS valor_implantacao_padrao numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_mensalidade_padrao numeric NOT NULL DEFAULT 0;

-- 2) Adicionar campos de precificação em módulos
ALTER TABLE public.modulos
  ADD COLUMN IF NOT EXISTS valor_implantacao_modulo numeric NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_mensalidade_modulo numeric NULL DEFAULT 0;

-- 3) Adicionar campo incluso_no_plano em plano_modulos
ALTER TABLE public.plano_modulos
  ADD COLUMN IF NOT EXISTS incluso_no_plano boolean NOT NULL DEFAULT true;

-- 4) Adicionar campos de desconto e valores originais em pedidos
-- Criar enum para tipo de desconto se não existir
DO $$ BEGIN
  CREATE TYPE public.desconto_tipo AS ENUM ('R$', '%');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS valor_implantacao_original numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_mensalidade_original numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_implantacao_tipo text NOT NULL DEFAULT 'R$',
  ADD COLUMN IF NOT EXISTS desconto_implantacao_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_implantacao_final numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_mensalidade_tipo text NOT NULL DEFAULT 'R$',
  ADD COLUMN IF NOT EXISTS desconto_mensalidade_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_mensalidade_final numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS modulos_adicionais jsonb NULL DEFAULT '[]'::jsonb;
