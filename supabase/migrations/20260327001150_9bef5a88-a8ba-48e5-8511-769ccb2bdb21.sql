ALTER TABLE public.pedido_comentarios ADD COLUMN IF NOT EXISTS anexos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.painel_comentarios ADD COLUMN IF NOT EXISTS anexos jsonb DEFAULT '[]'::jsonb;