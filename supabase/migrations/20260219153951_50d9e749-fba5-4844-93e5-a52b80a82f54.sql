-- Adicionar FKs faltantes na tabela contratos
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE RESTRICT;

ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_plano_id_fkey
  FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE SET NULL;