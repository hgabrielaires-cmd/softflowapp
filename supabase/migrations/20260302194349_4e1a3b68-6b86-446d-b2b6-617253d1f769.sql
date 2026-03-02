
-- Create table for likes on pedido_comentarios
CREATE TABLE public.pedido_curtidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comentario_id UUID NOT NULL REFERENCES public.pedido_comentarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comentario_id, user_id)
);

-- Enable RLS
ALTER TABLE public.pedido_curtidas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Autenticados visualizam pedido_curtidas"
ON public.pedido_curtidas FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados inserem pedido_curtidas"
ON public.pedido_curtidas FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios deletam suas pedido_curtidas"
ON public.pedido_curtidas FOR DELETE
USING (user_id = auth.uid());
