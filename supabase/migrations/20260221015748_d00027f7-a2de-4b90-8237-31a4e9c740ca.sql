
-- Tabela para configurações de integrações
CREATE TABLE public.integracoes_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT false,
  token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integracoes_config ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver e editar
CREATE POLICY "Admins can view integrations config"
  ON public.integracoes_config FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert integrations config"
  ON public.integracoes_config FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update integrations config"
  ON public.integracoes_config FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_integracoes_config_updated_at
  BEFORE UPDATE ON public.integracoes_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed com as integrações existentes
INSERT INTO public.integracoes_config (nome, ativo) VALUES
  ('zapsign', true),
  ('whatsapp', false),
  ('browserless', true);
