
CREATE TABLE public.helpdesk_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.helpdesk_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read tags" ON public.helpdesk_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert tags" ON public.helpdesk_tags
  FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default tags
INSERT INTO public.helpdesk_tags (nome) VALUES ('#NFE'), ('#NFCE');
