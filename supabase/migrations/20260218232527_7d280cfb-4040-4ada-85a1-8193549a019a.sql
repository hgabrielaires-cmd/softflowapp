
ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_status_pedido_check;

ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_status_pedido_check 
  CHECK (status_pedido = ANY (ARRAY[
    'Aguardando Financeiro'::text,
    'Aprovado Financeiro'::text,
    'Reprovado Financeiro'::text,
    'Cancelado'::text
  ]));
