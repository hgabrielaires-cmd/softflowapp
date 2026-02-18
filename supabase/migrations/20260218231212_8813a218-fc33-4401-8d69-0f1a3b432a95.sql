-- Adicionar campos de comissão separados (implantação e mensalidade) em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS comissao_implantacao_percentual numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS comissao_mensalidade_percentual numeric DEFAULT 5;

-- Migrar valor existente para ambos os campos novos (quem tinha comissao_percentual fica com o mesmo para os dois)
UPDATE public.profiles
SET
  comissao_implantacao_percentual = COALESCE(comissao_percentual, 5),
  comissao_mensalidade_percentual = COALESCE(comissao_percentual, 5)
WHERE comissao_implantacao_percentual = 5 AND comissao_mensalidade_percentual = 5;

-- Adicionar campos de comissão separados em pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS comissao_implantacao_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_implantacao_valor numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_mensalidade_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_mensalidade_valor numeric DEFAULT 0;

-- Migrar pedidos existentes: comissao_valor existente vai para comissao_implantacao_valor (retrocompatibilidade)
UPDATE public.pedidos
SET
  comissao_implantacao_percentual = comissao_percentual,
  comissao_implantacao_valor = comissao_valor,
  comissao_mensalidade_percentual = comissao_percentual,
  comissao_mensalidade_valor = 0
WHERE comissao_implantacao_valor = 0 AND comissao_mensalidade_valor = 0;