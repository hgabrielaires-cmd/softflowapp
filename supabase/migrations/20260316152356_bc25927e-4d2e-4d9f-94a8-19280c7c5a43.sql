CREATE TABLE public.crm_motivos_perda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_motivos_perda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read crm_motivos_perda"
  ON public.crm_motivos_perda FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage crm_motivos_perda"
  ON public.crm_motivos_perda FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));