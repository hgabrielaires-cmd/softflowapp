
-- Table to log billing notification sends (idempotency check)
CREATE TABLE public.notificacoes_cobranca_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID REFERENCES public.faturas(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID NOT NULL,
  tipo_gatilho TEXT NOT NULL, -- 'lembrete_5d', 'vencimento_dia', 'atraso_3d', 'atraso_5d', 'atraso_6d', 'fatura_gerada'
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  status_envio TEXT NOT NULL DEFAULT 'enviado' -- 'enviado', 'erro'
);

ALTER TABLE public.notificacoes_cobranca_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification logs"
  ON public.notificacoes_cobranca_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert notification logs"
  ON public.notificacoes_cobranca_log FOR INSERT TO authenticated WITH CHECK (true);

-- Table for billing reminder configuration per branch
CREATE TABLE public.cobranca_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id UUID REFERENCES public.filiais(id) ON DELETE CASCADE NOT NULL UNIQUE,
  regua_ativa BOOLEAN NOT NULL DEFAULT true,
  dias_lembrete_1 INT NOT NULL DEFAULT 5,
  dias_lembrete_vencimento BOOLEAN NOT NULL DEFAULT true,
  dias_atraso_alerta INT NOT NULL DEFAULT 3,
  dias_atraso_suspensao INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cobranca_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cobranca_config"
  ON public.cobranca_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage cobranca_config"
  ON public.cobranca_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
