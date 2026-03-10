
CREATE TABLE public.contratos_vendedor_lembretes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  vendedor_user_id UUID NOT NULL,
  cliente_nome TEXT NOT NULL,
  contrato_numero TEXT NOT NULL,
  decisor_nome TEXT NOT NULL,
  sign_url TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  lembrete_24h_enviado BOOLEAN NOT NULL DEFAULT false,
  lembrete_24h_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos_vendedor_lembretes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read own lembretes"
  ON public.contratos_vendedor_lembretes
  FOR SELECT TO authenticated
  USING (vendedor_user_id = auth.uid());

CREATE POLICY "Authenticated users can insert lembretes"
  ON public.contratos_vendedor_lembretes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE UNIQUE INDEX idx_lembretes_contrato_unique ON public.contratos_vendedor_lembretes (contrato_id);
