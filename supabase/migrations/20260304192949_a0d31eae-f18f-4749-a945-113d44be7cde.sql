
-- Create setores table
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin gerencia setores" ON public.setores FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam setores" ON public.setores FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Add setor_id to message_templates
ALTER TABLE public.message_templates ADD COLUMN setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL;

-- Updated_at trigger
CREATE TRIGGER update_setores_updated_at BEFORE UPDATE ON public.setores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
