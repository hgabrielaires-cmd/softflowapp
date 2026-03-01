
-- Tabela de curtidas nos comentários do painel
CREATE TABLE public.painel_curtidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comentario_id UUID NOT NULL REFERENCES public.painel_comentarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comentario_id, user_id)
);

ALTER TABLE public.painel_curtidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados visualizam curtidas" ON public.painel_curtidas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados inserem curtidas" ON public.painel_curtidas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Usuarios deletam suas curtidas" ON public.painel_curtidas FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_painel_curtidas_comentario ON public.painel_curtidas(comentario_id);
CREATE INDEX idx_painel_curtidas_user ON public.painel_curtidas(user_id);

-- Adicionar parent_id para respostas a comentários
ALTER TABLE public.painel_comentarios ADD COLUMN parent_id UUID REFERENCES public.painel_comentarios(id) ON DELETE CASCADE;
