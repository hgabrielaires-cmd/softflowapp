
ALTER TABLE public.pedidos ADD COLUMN motivo_desconto text;

-- Migrate existing data: copy observacoes to motivo_desconto for orders that have discounts
UPDATE public.pedidos 
SET motivo_desconto = observacoes 
WHERE (desconto_implantacao_valor > 0 OR desconto_mensalidade_valor > 0)
  AND observacoes IS NOT NULL 
  AND observacoes != '';
