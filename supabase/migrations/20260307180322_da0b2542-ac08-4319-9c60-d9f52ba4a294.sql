
CREATE TABLE public.contratos_cancelados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL,
  contrato_numero TEXT NOT NULL,
  contrato_tipo TEXT NOT NULL,
  contrato_base_id UUID,
  contrato_base_numero TEXT,
  cliente_id UUID NOT NULL,
  cliente_nome TEXT,
  filial_id UUID,
  plano_nome TEXT,
  tipo_pedido TEXT,
  cancelado_por UUID NOT NULL,
  motivo TEXT,
  cancelado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos_cancelados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia contratos_cancelados" ON public.contratos_cancelados
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados inserem contratos_cancelados" ON public.contratos_cancelados
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Gestor visualiza contratos_cancelados" ON public.contratos_cancelados
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor'));

CREATE POLICY "Financeiro visualiza contratos_cancelados" ON public.contratos_cancelados
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'financeiro'));
