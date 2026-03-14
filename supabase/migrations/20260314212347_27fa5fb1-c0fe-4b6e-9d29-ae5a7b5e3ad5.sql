
CREATE TABLE IF NOT EXISTS public.faturamento_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_financeiro_id UUID REFERENCES public.contratos_financeiros(id) ON DELETE SET NULL,
  mes INT NOT NULL,
  ano INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sucesso',
  valor NUMERIC NOT NULL DEFAULT 0,
  fatura_id UUID REFERENCES public.faturas(id) ON DELETE SET NULL,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.faturamento_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view faturamento_logs"
  ON public.faturamento_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert faturamento_logs"
  ON public.faturamento_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_faturamento_logs_contrato ON public.faturamento_logs(contrato_financeiro_id);
CREATE INDEX IF NOT EXISTS idx_faturamento_logs_periodo ON public.faturamento_logs(ano, mes);
