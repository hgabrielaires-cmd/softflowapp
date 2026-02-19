
-- Adicionar colunas de endereço em clientes (que UI já usa mas não persiste)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cep text NULL,
  ADD COLUMN IF NOT EXISTS logradouro text NULL,
  ADD COLUMN IF NOT EXISTS numero text NULL,
  ADD COLUMN IF NOT EXISTS complemento text NULL,
  ADD COLUMN IF NOT EXISTS bairro text NULL;

-- Adicionar colunas para geração de contrato
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS pdf_url text NULL,
  ADD COLUMN IF NOT EXISTS status_geracao text NULL DEFAULT 'Pendente';

-- Bucket privado para contratos gerados
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-pdf', 'contratos-pdf', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Admin pode ler/escrever no bucket contratos-pdf
CREATE POLICY "Admin acessa contratos-pdf"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'contratos-pdf' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'contratos-pdf' AND is_admin(auth.uid()));

-- RLS: Financeiro pode ler/escrever no bucket contratos-pdf
CREATE POLICY "Financeiro acessa contratos-pdf"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'contratos-pdf' AND has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (bucket_id = 'contratos-pdf' AND has_role(auth.uid(), 'financeiro'::app_role));
