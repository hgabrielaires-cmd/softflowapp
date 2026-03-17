
-- Tabela de log de sincronização
CREATE TABLE public.faturamento_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id UUID REFERENCES public.faturas(id) ON DELETE CASCADE,
  asaas_payment_id TEXT NOT NULL,
  status_anterior TEXT NOT NULL,
  status_novo TEXT NOT NULL,
  sincronizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faturamento_sync_log ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read
CREATE POLICY "Authenticated users can read sync logs"
ON public.faturamento_sync_log
FOR SELECT
TO authenticated
USING (true);

-- Index for performance
CREATE INDEX idx_faturamento_sync_log_fatura_id ON public.faturamento_sync_log(fatura_id);
CREATE INDEX idx_faturamento_sync_log_sincronizado_em ON public.faturamento_sync_log(sincronizado_em DESC);
