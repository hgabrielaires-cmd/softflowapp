
-- Criar tabela modelos_contrato
CREATE TABLE public.modelos_contrato (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'Contrato Base',
  ativo BOOLEAN NOT NULL DEFAULT true,
  arquivo_docx_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.modelos_contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia modelos_contrato"
  ON public.modelos_contrato FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam modelos_contrato"
  ON public.modelos_contrato FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_modelos_contrato_updated_at
  BEFORE UPDATE ON public.modelos_contrato
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket para arquivos DOCX
INSERT INTO storage.buckets (id, name, public)
  VALUES ('modelos-contrato', 'modelos-contrato', false)
  ON CONFLICT (id) DO NOTHING;

-- Políticas do storage
CREATE POLICY "Admin faz upload de modelos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'modelos-contrato' AND is_admin(auth.uid()));

CREATE POLICY "Admin atualiza modelos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'modelos-contrato' AND is_admin(auth.uid()));

CREATE POLICY "Admin deleta modelos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'modelos-contrato' AND is_admin(auth.uid()));

CREATE POLICY "Autenticados leem modelos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'modelos-contrato' AND auth.uid() IS NOT NULL);
