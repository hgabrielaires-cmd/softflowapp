
-- Tabela de cargos para CRM
CREATE TABLE public.crm_cargos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_cargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia crm_cargos" ON public.crm_cargos FOR ALL TO public USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam crm_cargos" ON public.crm_cargos FOR SELECT TO public USING (auth.uid() IS NOT NULL);

-- Tabela de contatos da oportunidade CRM
CREATE TABLE public.crm_oportunidade_contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  oportunidade_id uuid NOT NULL REFERENCES public.crm_oportunidades(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text NOT NULL,
  cargo_id uuid REFERENCES public.crm_cargos(id),
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_oportunidade_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia crm_oportunidade_contatos" ON public.crm_oportunidade_contatos FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Gestor gerencia crm_oportunidade_contatos" ON public.crm_oportunidade_contatos FOR ALL TO authenticated USING (has_role(auth.uid(), 'gestor'::app_role)) WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "Vendedor gerencia proprios contatos oportunidade" ON public.crm_oportunidade_contatos FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM crm_oportunidades o WHERE o.id = crm_oportunidade_contatos.oportunidade_id AND o.responsavel_id = auth.uid() AND has_role(auth.uid(), 'vendedor'::app_role))
) WITH CHECK (
  EXISTS (SELECT 1 FROM crm_oportunidades o WHERE o.id = crm_oportunidade_contatos.oportunidade_id AND o.responsavel_id = auth.uid() AND has_role(auth.uid(), 'vendedor'::app_role))
);
CREATE POLICY "Autenticados visualizam crm_oportunidade_contatos" ON public.crm_oportunidade_contatos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
