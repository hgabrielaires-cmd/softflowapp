
-- ═══════════════════════════════════════════════════════════
-- Tabela: parcelas_implantacao
-- Controla parcelas de implantação (contrato inicial + upgrades)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.parcelas_implantacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_financeiro_id UUID NOT NULL REFERENCES public.contratos_financeiros(id) ON DELETE CASCADE,
  contrato_origem_id UUID REFERENCES public.contratos(id),
  descricao TEXT NOT NULL,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  valor_por_parcela NUMERIC NOT NULL DEFAULT 0,
  parcelas_pagas INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parcelas_impl_cf ON public.parcelas_implantacao(contrato_financeiro_id);
CREATE INDEX idx_parcelas_impl_status ON public.parcelas_implantacao(status);

ALTER TABLE public.parcelas_implantacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage parcelas_implantacao"
  ON public.parcelas_implantacao
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- Tabela: contrato_financeiro_historico
-- Registra cada alteração no contrato financeiro base
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.contrato_financeiro_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_financeiro_id UUID NOT NULL REFERENCES public.contratos_financeiros(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  dados_anteriores JSONB DEFAULT '{}',
  dados_novos JSONB DEFAULT '{}',
  contrato_origem_id UUID REFERENCES public.contratos(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cf_historico_cf ON public.contrato_financeiro_historico(contrato_financeiro_id);

ALTER TABLE public.contrato_financeiro_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage contrato_financeiro_historico"
  ON public.contrato_financeiro_historico
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
