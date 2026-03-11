
-- 1. Add "Contrato Retroativo" to pedidos_status_pedido_check
ALTER TABLE public.pedidos DROP CONSTRAINT pedidos_status_pedido_check;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_status_pedido_check CHECK (status_pedido = ANY (ARRAY['Aguardando Financeiro'::text, 'Aprovado Financeiro'::text, 'Reprovado Financeiro'::text, 'Cancelado'::text, 'Aguardando Aprovação de Desconto'::text, 'Desconto Aprovado'::text, 'Contrato Retroativo'::text]));

-- 2. Add dia_mensalidade column to pedidos
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS dia_mensalidade integer;
