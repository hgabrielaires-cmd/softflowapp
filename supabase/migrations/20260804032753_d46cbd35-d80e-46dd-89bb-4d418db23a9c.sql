CREATE TABLE IF NOT EXISTS public.contaazul_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contaazul_tokens_filial_uidx ON public.contaazul_tokens(filial_id);

GRANT ALL ON public.contaazul_tokens TO service_role;
ALTER TABLE public.contaazul_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver status de conexao Conta Azul"
  ON public.contaazul_tokens FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER tr_contaazul_tokens_updated_at
  BEFORE UPDATE ON public.contaazul_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.contaazul_sync_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  periodo_inicio date,
  periodo_fim date,
  registros_importados int NOT NULL DEFAULT 0,
  registros_ignorados int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sucesso',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contaazul_sync_log_created_idx ON public.contaazul_sync_log(created_at DESC);

GRANT SELECT ON public.contaazul_sync_log TO authenticated;
GRANT ALL ON public.contaazul_sync_log TO service_role;
ALTER TABLE public.contaazul_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e financeiro podem ver logs Conta Azul"
  ON public.contaazul_sync_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role));