
-- 1. Add contrato_financeiro_id FK to faturas
ALTER TABLE public.faturas
  ADD COLUMN IF NOT EXISTS contrato_financeiro_id uuid REFERENCES public.contratos_financeiros(id);

-- 2. Create faturamento_cron_logs table
CREATE TABLE IF NOT EXISTS public.faturamento_cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executado_em timestamptz NOT NULL DEFAULT now(),
  mes int NOT NULL,
  ano int NOT NULL,
  total_contratos int NOT NULL DEFAULT 0,
  total_faturados int NOT NULL DEFAULT 0,
  total_erros int NOT NULL DEFAULT 0,
  total_ja_faturados int NOT NULL DEFAULT 0,
  detalhes jsonb DEFAULT '[]'::jsonb
);

-- 3. RLS on faturamento_cron_logs (admin-only read, no public write)
ALTER TABLE public.faturamento_cron_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read cron logs"
  ON public.faturamento_cron_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. Index for idempotency check on faturas
CREATE INDEX IF NOT EXISTS idx_faturas_cf_ref
  ON public.faturas (contrato_financeiro_id, referencia_mes, referencia_ano)
  WHERE gerado_automaticamente = true;
