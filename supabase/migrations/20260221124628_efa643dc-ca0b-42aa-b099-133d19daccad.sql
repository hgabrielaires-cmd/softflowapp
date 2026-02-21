
-- Create fornecedores table with similar structure to clientes
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT,
  cnpj_cpf TEXT NOT NULL,
  inscricao_estadual TEXT,
  contato_nome TEXT,
  telefone TEXT,
  email TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin gerencia fornecedores"
ON public.fornecedores
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Financeiro full access
CREATE POLICY "Financeiro gerencia fornecedores"
ON public.fornecedores
FOR ALL
USING (has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

-- Authenticated users can view
CREATE POLICY "Autenticados visualizam fornecedores"
ON public.fornecedores
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_fornecedores_updated_at
BEFORE UPDATE ON public.fornecedores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
