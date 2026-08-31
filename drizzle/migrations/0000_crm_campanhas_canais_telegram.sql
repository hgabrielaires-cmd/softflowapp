ALTER TABLE public.profiles ADD COLUMN telegram_id BIGINT UNIQUE;
COMMENT ON COLUMN public.profiles.telegram_id IS 'ID do chat/usuário no Telegram, usado pelo bot de vendedores para identificar quem está falando';

CREATE TABLE public.crm_campanhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_campanhas TO authenticated;
GRANT ALL ON public.crm_campanhas TO service_role;
ALTER TABLE public.crm_campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia campanhas" ON public.crm_campanhas FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam campanhas" ON public.crm_campanhas FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TABLE public.crm_canais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_canais TO authenticated;
GRANT ALL ON public.crm_canais TO service_role;
ALTER TABLE public.crm_canais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia canais" ON public.crm_canais FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam canais" ON public.crm_canais FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE public.crm_oportunidades
  ADD COLUMN campanha_id UUID REFERENCES public.crm_campanhas(id),
  ADD COLUMN canal_id UUID REFERENCES public.crm_canais(id),
  ADD COLUMN parcelamento_implantacao INTEGER NOT NULL DEFAULT 1;
COMMENT ON COLUMN public.crm_oportunidades.parcelamento_implantacao IS 'Número de parcelas do valor de implantação (1 = à vista)';

ALTER TABLE public.crm_oportunidades
  ADD COLUMN criado_via TEXT NOT NULL DEFAULT 'web' CHECK (criado_via IN ('web', 'telegram'));