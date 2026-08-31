CREATE TABLE public.telegram_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_bots TO authenticated;
GRANT ALL ON public.telegram_bots TO service_role;

ALTER TABLE public.telegram_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia telegram_bots"
ON public.telegram_bots FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam telegram_bots"
ON public.telegram_bots FOR SELECT
USING (auth.uid() IS NOT NULL);

INSERT INTO public.telegram_bots (nome, slug) VALUES
  ('Softplus Financeiro', 'financeiro'),
  ('Softplus Vendas', 'vendas');

CREATE TABLE public.telegram_bot_acessos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES public.telegram_bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (bot_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_bot_acessos TO authenticated;
GRANT ALL ON public.telegram_bot_acessos TO service_role;

ALTER TABLE public.telegram_bot_acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia telegram_bot_acessos"
ON public.telegram_bot_acessos FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam telegram_bot_acessos"
ON public.telegram_bot_acessos FOR SELECT
USING (auth.uid() IS NOT NULL);