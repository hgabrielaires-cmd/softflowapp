ALTER TABLE public.contratos_financeiros 
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;

ALTER TABLE public.faturas 
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS asaas_url TEXT;

CREATE TABLE IF NOT EXISTS public.asaas_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  payload JSONB
);

ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente sistema" ON public.asaas_webhook_events
  FOR ALL TO authenticated USING (false);

CREATE INDEX IF NOT EXISTS idx_asaas_webhook_event_id ON public.asaas_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_faturas_asaas_payment_id ON public.faturas(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_contratos_fin_asaas_customer ON public.contratos_financeiros(asaas_customer_id);