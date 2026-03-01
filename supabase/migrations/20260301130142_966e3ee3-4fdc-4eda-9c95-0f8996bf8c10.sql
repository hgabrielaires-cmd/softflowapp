
-- Table to track @mentions in comments
CREATE TABLE public.painel_mencoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comentario_id UUID NOT NULL REFERENCES public.painel_comentarios(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  mencionado_user_id UUID NOT NULL,
  mencionado_por UUID NOT NULL,
  lido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.painel_mencoes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Autenticados inserem mencoes"
ON public.painel_mencoes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados visualizam mencoes"
ON public.painel_mencoes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios atualizam suas mencoes"
ON public.painel_mencoes FOR UPDATE
USING (mencionado_user_id = auth.uid());

CREATE POLICY "Admin deleta mencoes"
ON public.painel_mencoes FOR DELETE
USING (is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_painel_mencoes_mencionado ON public.painel_mencoes(mencionado_user_id, lido);
CREATE INDEX idx_painel_mencoes_card ON public.painel_mencoes(card_id);
CREATE INDEX idx_painel_mencoes_comentario ON public.painel_mencoes(comentario_id);
