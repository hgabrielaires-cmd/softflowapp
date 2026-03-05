
-- Add permite_cancelar_projeto to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permite_cancelar_projeto boolean NOT NULL DEFAULT false;

-- Create projetos_cancelados table for reporting
CREATE TABLE public.projetos_cancelados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL,
  contrato_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  filial_id uuid NOT NULL,
  motivo text NOT NULL,
  cancelado_por uuid NOT NULL,
  cancelado_em timestamp with time zone NOT NULL DEFAULT now(),
  tipo_operacao text,
  plano_nome text,
  cliente_nome text,
  contrato_numero text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.projetos_cancelados ENABLE ROW LEVEL SECURITY;

-- RLS policies for projetos_cancelados
CREATE POLICY "Admin gerencia projetos_cancelados"
  ON public.projetos_cancelados FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor visualiza projetos_cancelados"
  ON public.projetos_cancelados FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional visualiza projetos_cancelados"
  ON public.projetos_cancelados FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Financeiro visualiza projetos_cancelados"
  ON public.projetos_cancelados FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Autenticados inserem projetos_cancelados"
  ON public.projetos_cancelados FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Filial filter projetos_cancelados"
  ON public.projetos_cancelados FOR ALL TO authenticated
  USING (user_has_filial_access(filial_id))
  WITH CHECK (user_has_filial_access(filial_id));
