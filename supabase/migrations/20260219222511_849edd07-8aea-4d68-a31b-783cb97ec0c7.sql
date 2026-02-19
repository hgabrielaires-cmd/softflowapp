
-- Tabela de templates HTML para contratos
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('CONTRATO_BASE', 'ADITIVO', 'CANCELAMENTO')),
  filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  conteudo_html text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  versao integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia document_templates"
  ON public.document_templates FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam document_templates"
  ON public.document_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger: atualizar updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: garantir apenas 1 modelo ativo por tipo + filial
CREATE OR REPLACE FUNCTION public.enforce_single_active_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ativo = true THEN
    UPDATE public.document_templates
    SET ativo = false, updated_at = now()
    WHERE tipo = NEW.tipo
      AND ativo = true
      AND id != NEW.id
      AND (
        (filial_id IS NULL AND NEW.filial_id IS NULL)
        OR (filial_id = NEW.filial_id)
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_single_active_template
  BEFORE INSERT OR UPDATE OF ativo ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_template();

-- Trigger: incrementar versão ao editar conteúdo
CREATE OR REPLACE FUNCTION public.increment_template_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.conteudo_html IS DISTINCT FROM NEW.conteudo_html THEN
    NEW.versao := OLD.versao + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_template_version
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_template_version();
