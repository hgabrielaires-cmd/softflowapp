CREATE TABLE IF NOT EXISTS public.telegram_memoria (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj_fornecedor text UNIQUE NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  plano_conta_id uuid REFERENCES public.fin_plano_contas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.telegram_memoria TO authenticated;
GRANT ALL ON public.telegram_memoria TO service_role;
ALTER TABLE public.telegram_memoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem ver memoria telegram" ON public.telegram_memoria
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_telegram_memoria_updated_at
BEFORE UPDATE ON public.telegram_memoria
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.telegram_pendencias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id bigint NOT NULL,
  user_id bigint NOT NULL,
  dados_extraidos jsonb,
  fornecedor_id uuid,
  fornecedor_nome text,
  forma_pagamento_id uuid,
  conta_financeira_id uuid,
  centro_custo_id uuid,
  plano_conta_id uuid,
  plano_conta_sugerido_id uuid,
  anexo_url text,
  etapa text NOT NULL DEFAULT 'plano_contas',
  status text NOT NULL DEFAULT 'aguardando_resposta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.telegram_pendencias TO authenticated;
GRANT ALL ON public.telegram_pendencias TO service_role;
ALTER TABLE public.telegram_pendencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem ver pendencias telegram" ON public.telegram_pendencias
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_telegram_pendencias_chat_status
ON public.telegram_pendencias (chat_id, status, created_at DESC);

CREATE TRIGGER update_telegram_pendencias_updated_at
BEFORE UPDATE ON public.telegram_pendencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();