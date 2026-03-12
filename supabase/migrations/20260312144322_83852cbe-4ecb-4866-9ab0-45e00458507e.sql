
-- Tabela de oportunidades do CRM
CREATE TABLE public.crm_oportunidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funil_id UUID NOT NULL REFERENCES public.crm_funis(id) ON DELETE CASCADE,
  etapa_id UUID NOT NULL REFERENCES public.crm_etapas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  contato_id UUID REFERENCES public.cliente_contatos(id) ON DELETE SET NULL,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  campos_personalizados JSONB NOT NULL DEFAULT '{}'::jsonb,
  origem TEXT,
  data_previsao_fechamento DATE,
  motivo_perda TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.crm_oportunidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia crm_oportunidades"
ON public.crm_oportunidades FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor gerencia crm_oportunidades"
ON public.crm_oportunidades FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Vendedor gerencia proprias oportunidades"
ON public.crm_oportunidades FOR ALL TO authenticated
USING (has_role(auth.uid(), 'vendedor'::app_role) AND responsavel_id = auth.uid())
WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role) AND responsavel_id = auth.uid());

CREATE POLICY "Vendedor visualiza todas oportunidades"
ON public.crm_oportunidades FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Financeiro visualiza crm_oportunidades"
ON public.crm_oportunidades FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Operacional visualiza crm_oportunidades"
ON public.crm_oportunidades FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'operacional'::app_role));
