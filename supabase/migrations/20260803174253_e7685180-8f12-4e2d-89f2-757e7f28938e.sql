ALTER TABLE public.integracoes_config ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.integracoes_config (nome, ativo, config)
VALUES
  ('telegram', false, '{"authorized_ids": "738302128", "webhook_url": ""}'::jsonb),
  ('anthropic', false, '{"model": "claude-sonnet-4-6"}'::jsonb)
ON CONFLICT (nome) DO NOTHING;