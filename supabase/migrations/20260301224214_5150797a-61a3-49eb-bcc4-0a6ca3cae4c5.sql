
-- Create segmentos table for CRM
CREATE TABLE public.segmentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.segmentos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin gerencia segmentos"
ON public.segmentos FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam segmentos"
ON public.segmentos FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add segmento_id to contratos
ALTER TABLE public.contratos ADD COLUMN segmento_id UUID REFERENCES public.segmentos(id);

-- Add segmento_id to pedidos
ALTER TABLE public.pedidos ADD COLUMN segmento_id UUID REFERENCES public.segmentos(id);
