
-- Table to store per-branch prices for plans and modules
CREATE TABLE public.precos_filial (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('plano', 'modulo')),
  referencia_id UUID NOT NULL,
  filial_id UUID NOT NULL REFERENCES public.filiais(id) ON DELETE CASCADE,
  valor_implantacao NUMERIC NOT NULL DEFAULT 0,
  valor_mensalidade NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tipo, referencia_id, filial_id)
);

-- Enable RLS
ALTER TABLE public.precos_filial ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin gerencia precos_filial"
  ON public.precos_filial FOR ALL
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Authenticated users can read
CREATE POLICY "Autenticados visualizam precos_filial"
  ON public.precos_filial FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE TRIGGER update_precos_filial_updated_at
  BEFORE UPDATE ON public.precos_filial
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
