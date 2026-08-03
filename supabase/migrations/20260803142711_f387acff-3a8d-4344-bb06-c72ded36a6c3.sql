-- ─── Plano de Contas (hierárquico) ───────────────────────────────────────
CREATE TABLE public.fin_plano_contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES public.fin_plano_contas(id) ON DELETE RESTRICT,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'despesa',
  nivel INTEGER NOT NULL DEFAULT 1,
  aceita_lancamento BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fin_plano_contas_codigo_unique UNIQUE (codigo),
  CONSTRAINT fin_plano_contas_tipo_check CHECK (tipo IN ('receita','despesa'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_plano_contas TO authenticated;
GRANT ALL ON public.fin_plano_contas TO service_role;
ALTER TABLE public.fin_plano_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_plano_contas_select" ON public.fin_plano_contas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_plano_contas_manage" ON public.fin_plano_contas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE INDEX idx_fin_plano_contas_parent ON public.fin_plano_contas(parent_id);
CREATE TRIGGER tr_fin_plano_contas_updated_at BEFORE UPDATE ON public.fin_plano_contas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Centros de Custo ────────────────────────────────────────────────────
CREATE TABLE public.fin_centros_custo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_centros_custo TO authenticated;
GRANT ALL ON public.fin_centros_custo TO service_role;
ALTER TABLE public.fin_centros_custo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_centros_custo_select" ON public.fin_centros_custo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_centros_custo_manage" ON public.fin_centros_custo
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER tr_fin_centros_custo_updated_at BEFORE UPDATE ON public.fin_centros_custo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Formas de Pagamento ─────────────────────────────────────────────────
CREATE TABLE public.fin_formas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Outros',
  exige_conta BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_formas_pagamento TO authenticated;
GRANT ALL ON public.fin_formas_pagamento TO service_role;
ALTER TABLE public.fin_formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_formas_pagamento_select" ON public.fin_formas_pagamento
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_formas_pagamento_manage" ON public.fin_formas_pagamento
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER tr_fin_formas_pagamento_updated_at BEFORE UPDATE ON public.fin_formas_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Contas Financeiras ──────────────────────────────────────────────────
CREATE TABLE public.fin_contas_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Banco',
  banco TEXT,
  agencia TEXT,
  numero_conta TEXT,
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_contas_financeiras TO authenticated;
GRANT ALL ON public.fin_contas_financeiras TO service_role;
ALTER TABLE public.fin_contas_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_contas_financeiras_select" ON public.fin_contas_financeiras
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fin_contas_financeiras_manage" ON public.fin_contas_financeiras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER tr_fin_contas_financeiras_updated_at BEFORE UPDATE ON public.fin_contas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();