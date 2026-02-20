
-- Tabela para rastrear documentos enviados ao ZapSign
CREATE TABLE public.contratos_zapsign (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  zapsign_doc_token TEXT NOT NULL,
  zapsign_doc_id TEXT,
  status TEXT NOT NULL DEFAULT 'Enviado',
  signers JSONB DEFAULT '[]'::jsonb,
  sign_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contrato_id)
);

-- Enable RLS
ALTER TABLE public.contratos_zapsign ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin gerencia contratos_zapsign"
  ON public.contratos_zapsign FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Financeiro gerencia contratos_zapsign"
  ON public.contratos_zapsign FOR ALL
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Vendedor visualiza contratos_zapsign da sua filial"
  ON public.contratos_zapsign FOR SELECT
  USING (
    has_role(auth.uid(), 'vendedor'::app_role) AND
    contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN clientes cl ON cl.id = c.cliente_id
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE cl.filial_id = p.filial_id
    )
  );

CREATE POLICY "Tecnico visualiza contratos_zapsign"
  ON public.contratos_zapsign FOR SELECT
  USING (has_role(auth.uid(), 'tecnico'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_contratos_zapsign_updated_at
  BEFORE UPDATE ON public.contratos_zapsign
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
