ALTER TABLE public.pedidos DROP CONSTRAINT pedidos_status_pedido_check;

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_status_pedido_check
  CHECK (status_pedido IN (
    'Aguardando Financeiro',
    'Aguardando Aprovação de Desconto',
    'Desconto Aprovado',
    'Aprovado Financeiro',
    'Reprovado Financeiro',
    'Cancelado',
    'Contrato Retroativo',
    'Aguardando Ajuste Vendedor'
  ));