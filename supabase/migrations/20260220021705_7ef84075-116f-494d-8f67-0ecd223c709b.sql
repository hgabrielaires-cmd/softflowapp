
-- 1. Biblioteca de cláusulas reutilizáveis
CREATE TABLE public.contract_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo_html TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'CONTRATO_BASE',
  ordem_padrao INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia contract_clauses"
ON public.contract_clauses FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam contract_clauses"
ON public.contract_clauses FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_contract_clauses_updated_at
BEFORE UPDATE ON public.contract_clauses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Cláusulas de cada modelo (template)
CREATE TABLE public.template_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  clause_id UUID REFERENCES public.contract_clauses(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  conteudo_html TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.template_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia template_clauses"
ON public.template_clauses FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam template_clauses"
ON public.template_clauses FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_template_clauses_updated_at
BEFORE UPDATE ON public.template_clauses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Adicionar flag usa_clausulas ao document_templates
ALTER TABLE public.document_templates
ADD COLUMN usa_clausulas BOOLEAN NOT NULL DEFAULT false;
