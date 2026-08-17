ALTER TABLE public.faturas
  ADD COLUMN IF NOT EXISTS boleto_nosso_numero text,
  ADD COLUMN IF NOT EXISTS boleto_linha_digitavel text,
  ADD COLUMN IF NOT EXISTS boleto_codigo_barras text,
  ADD COLUMN IF NOT EXISTS boleto_pdf_url text,
  ADD COLUMN IF NOT EXISTS gateway text,
  ADD COLUMN IF NOT EXISTS gateway_payment_id text;

CREATE INDEX IF NOT EXISTS idx_faturas_boleto_nosso_numero ON public.faturas (boleto_nosso_numero);

CREATE TABLE IF NOT EXISTS public.sicredi_boletos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id uuid REFERENCES public.faturas(id) ON DELETE SET NULL,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  nosso_numero text NOT NULL UNIQUE,
  seu_numero text,
  cooperativa text,
  posto text,
  codigo_beneficiario text,
  carteira text,
  valor numeric,
  data_vencimento date,
  status text NOT NULL DEFAULT 'EMITIDO',
  linha_digitavel text,
  codigo_barras text,
  pdf_url text,
  txid text,
  qrcode_pix text,
  movimento_webhook text,
  valor_liquidacao numeric,
  liquidado_em timestamptz,
  payload_emissao jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sicredi_boletos TO authenticated;
GRANT ALL ON public.sicredi_boletos TO service_role;
ALTER TABLE public.sicredi_boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e financeiro veem boletos sicredi"
ON public.sicredi_boletos FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'::app_role));

CREATE TRIGGER tr_sicredi_boletos_updated_at
BEFORE UPDATE ON public.sicredi_boletos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.sicredi_webhook_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_evento_webhook text UNIQUE,
  nosso_numero text,
  movimento text,
  payload jsonb NOT NULL,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sicredi_webhook_eventos TO authenticated;
GRANT ALL ON public.sicredi_webhook_eventos TO service_role;
ALTER TABLE public.sicredi_webhook_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e financeiro veem eventos sicredi"
ON public.sicredi_webhook_eventos FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'::app_role));

CREATE INDEX IF NOT EXISTS idx_sicredi_webhook_eventos_nosso_numero ON public.sicredi_webhook_eventos (nosso_numero);