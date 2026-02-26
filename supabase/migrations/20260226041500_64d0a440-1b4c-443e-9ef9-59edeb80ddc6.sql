
-- Add etapa_id to painel_comentarios to associate comments with specific stages
ALTER TABLE public.painel_comentarios ADD COLUMN etapa_id uuid REFERENCES public.painel_etapas(id);

-- Create index for performance
CREATE INDEX idx_painel_comentarios_etapa_id ON public.painel_comentarios(etapa_id);
