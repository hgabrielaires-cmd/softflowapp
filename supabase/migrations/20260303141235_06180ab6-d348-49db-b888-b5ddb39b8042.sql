ALTER TABLE public.pedidos
  ADD COLUMN acrescimo_implantacao_tipo text NOT NULL DEFAULT 'R$',
  ADD COLUMN acrescimo_implantacao_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN acrescimo_mensalidade_tipo text NOT NULL DEFAULT 'R$',
  ADD COLUMN acrescimo_mensalidade_valor numeric NOT NULL DEFAULT 0;