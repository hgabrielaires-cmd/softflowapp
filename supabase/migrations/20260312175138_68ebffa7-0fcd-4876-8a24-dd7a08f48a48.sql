
CREATE TABLE public.crm_oportunidade_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  oportunidade_id UUID NOT NULL REFERENCES public.crm_oportunidades(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('plano', 'modulo')),
  referencia_id UUID NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_implantacao NUMERIC NOT NULL DEFAULT 0,
  valor_mensalidade NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_oportunidade_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage crm_oportunidade_produtos"
  ON public.crm_oportunidade_produtos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
