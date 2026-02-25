
-- Junction table for multi-filial per user
CREATE TABLE public.usuario_filiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, filial_id)
);

-- Enable RLS
ALTER TABLE public.usuario_filiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia usuario_filiais" ON public.usuario_filiais
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam usuario_filiais" ON public.usuario_filiais
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add global access flag to profiles
ALTER TABLE public.profiles ADD COLUMN acesso_global BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing filial_id data to junction table
INSERT INTO public.usuario_filiais (user_id, filial_id)
SELECT user_id, filial_id FROM public.profiles WHERE filial_id IS NOT NULL
ON CONFLICT DO NOTHING;
