
-- Add parent_id for replies
ALTER TABLE public.pedido_comentarios 
ADD COLUMN parent_id UUID REFERENCES public.pedido_comentarios(id) ON DELETE CASCADE;

-- Index for fast lookup of replies
CREATE INDEX idx_pedido_comentarios_parent_id ON public.pedido_comentarios(parent_id);
