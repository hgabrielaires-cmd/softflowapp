
ALTER TABLE public.crm_oportunidades
  ADD COLUMN IF NOT EXISTS data_fechamento timestamptz,
  ADD COLUMN IF NOT EXISTS pedido_id uuid REFERENCES public.pedidos(id);
