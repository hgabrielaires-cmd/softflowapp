
-- Tabela para múltiplos comentários por card
CREATE TABLE public.painel_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  criado_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.painel_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados visualizam painel_comentarios" ON public.painel_comentarios
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados inserem painel_comentarios" ON public.painel_comentarios
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin deleta painel_comentarios" ON public.painel_comentarios
  FOR DELETE USING (is_admin(auth.uid()));

-- Tabela para técnicos vinculados ao card (multi-select)
CREATE TABLE public.painel_tecnicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.painel_atendimento(id) ON DELETE CASCADE,
  tecnico_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, tecnico_id)
);

ALTER TABLE public.painel_tecnicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados visualizam painel_tecnicos" ON public.painel_tecnicos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados gerenciam painel_tecnicos" ON public.painel_tecnicos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados deletam painel_tecnicos" ON public.painel_tecnicos
  FOR DELETE USING (auth.uid() IS NOT NULL);
