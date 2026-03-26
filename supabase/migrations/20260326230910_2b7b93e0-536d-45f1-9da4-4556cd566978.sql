
CREATE TABLE public.r2_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean DEFAULT false,
  endpoint text,
  access_key_id text,
  secret_access_key text,
  bucket_name text,
  public_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.r2_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read r2_config"
  ON public.r2_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert r2_config"
  ON public.r2_config FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update r2_config"
  ON public.r2_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete r2_config"
  ON public.r2_config FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_r2_config_updated_at
  BEFORE UPDATE ON public.r2_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
