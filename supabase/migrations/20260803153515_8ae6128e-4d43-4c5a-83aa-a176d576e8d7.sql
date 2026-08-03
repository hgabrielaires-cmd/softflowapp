CREATE TABLE public.fin_despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL DEFAULT gen_random_uuid(),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  plano_conta_id uuid NOT NULL REFERENCES public.fin_plano_contas(id),
  forma_pagamento_id uuid NOT NULL REFERENCES public.fin_formas_pagamento(id),
  conta_financeira_id uuid NOT NULL REFERENCES public.fin_contas_financeiras(id),
  valor numeric NOT NULL DEFAULT 0,
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL,
  codigo_barras text,
  descricao text,
  anexo_url text,
  recorrente boolean NOT NULL DEFAULT false,
  recorrencia_periodo text,
  recorrencia_vezes integer,
  parcela_numero integer NOT NULL DEFAULT 1,
  parcela_total integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Pendente',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fin_despesa_rateios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  despesa_id uuid NOT NULL REFERENCES public.fin_despesas(id) ON DELETE CASCADE,
  centro_custo_id uuid NOT NULL REFERENCES public.fin_centros_custo(id),
  percentual numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_despesas TO authenticated;
GRANT ALL ON public.fin_despesas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_despesa_rateios TO authenticated;
GRANT ALL ON public.fin_despesa_rateios TO service_role;

ALTER TABLE public.fin_despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_despesa_rateios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financeiro pode ver despesas" ON public.fin_despesas FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE POLICY "Financeiro pode lancar despesas" ON public.fin_despesas FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE POLICY "Financeiro pode editar despesas" ON public.fin_despesas FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE POLICY "Admin e financeiro podem excluir despesas" ON public.fin_despesas FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro'));

CREATE POLICY "Financeiro pode ver rateios" ON public.fin_despesa_rateios FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE POLICY "Financeiro pode gerenciar rateios" ON public.fin_despesa_rateios FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE INDEX idx_fin_despesas_venc ON public.fin_despesas(data_vencimento);
CREATE INDEX idx_fin_despesas_fornecedor ON public.fin_despesas(fornecedor_id);
CREATE INDEX idx_fin_despesas_grupo ON public.fin_despesas(grupo_id);
CREATE INDEX idx_fin_despesa_rateios_despesa ON public.fin_despesa_rateios(despesa_id);

CREATE TRIGGER update_fin_despesas_updated_at BEFORE UPDATE ON public.fin_despesas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();