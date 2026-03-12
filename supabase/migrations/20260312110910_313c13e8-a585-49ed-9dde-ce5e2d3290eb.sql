
-- Funis de Venda
CREATE TABLE public.crm_funis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_funis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia crm_funis" ON public.crm_funis FOR ALL TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam crm_funis" ON public.crm_funis FOR SELECT TO public USING (auth.uid() IS NOT NULL);

-- Etapas do CRM (vinculadas a um funil)
CREATE TABLE public.crm_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funil_id UUID NOT NULL REFERENCES public.crm_funis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#6366f1',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia crm_etapas" ON public.crm_etapas FOR ALL TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam crm_etapas" ON public.crm_etapas FOR SELECT TO public USING (auth.uid() IS NOT NULL);

-- Campos Personalizados do CRM
CREATE TABLE public.crm_campos_personalizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'select',
  opcoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_campos_personalizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia crm_campos_personalizados" ON public.crm_campos_personalizados FOR ALL TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam crm_campos_personalizados" ON public.crm_campos_personalizados FOR SELECT TO public USING (auth.uid() IS NOT NULL);
