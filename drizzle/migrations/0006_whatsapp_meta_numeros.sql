CREATE TABLE IF NOT EXISTS public.whatsapp_meta_numeros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id uuid REFERENCES public.filiais(id),
  apelido text NOT NULL,
  phone_number_id text NOT NULL UNIQUE,
  waba_id text NOT NULL,
  access_token text NOT NULL,
  phone_number text,
  display_name text,
  status text NOT NULL DEFAULT 'connected',
  coexistencia boolean NOT NULL DEFAULT false,
  padrao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Token nunca é lido pelo navegador: só colunas não sensíveis são liberadas
GRANT SELECT (id, filial_id, apelido, phone_number_id, waba_id, phone_number, display_name, status, coexistencia, padrao, ativo, created_at, updated_at) ON public.whatsapp_meta_numeros TO authenticated;
GRANT UPDATE (apelido, filial_id, padrao, ativo, updated_at) ON public.whatsapp_meta_numeros TO authenticated;
GRANT DELETE ON public.whatsapp_meta_numeros TO authenticated;
GRANT ALL ON public.whatsapp_meta_numeros TO service_role;
ALTER TABLE public.whatsapp_meta_numeros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados veem numeros meta" ON public.whatsapp_meta_numeros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins atualizam numeros meta" ON public.whatsapp_meta_numeros FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins removem numeros meta" ON public.whatsapp_meta_numeros FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER update_whatsapp_meta_numeros_updated_at BEFORE UPDATE ON public.whatsapp_meta_numeros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS meta_phone_number_id text;

INSERT INTO public.whatsapp_meta_numeros (filial_id, apelido, phone_number_id, waba_id, access_token, phone_number, display_name, padrao, ativo)
SELECT (SELECT id FROM public.filiais WHERE nome ILIKE '%natal%' LIMIT 1), 'Softplus Natal',
  config->>'phone_number_id', config->>'waba_id', config->>'access_token', config->>'phone_number', 'Softflow', true, true
FROM public.integracoes_config
WHERE nome = 'whatsapp_meta' AND config->>'phone_number_id' IS NOT NULL AND config->>'access_token' IS NOT NULL
ON CONFLICT (phone_number_id) DO NOTHING;