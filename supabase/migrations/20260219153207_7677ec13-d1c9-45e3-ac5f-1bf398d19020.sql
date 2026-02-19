-- Adicionar FK de contratos.pedido_id para pedidos.id
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_pedido_id_fkey
  FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE SET NULL;