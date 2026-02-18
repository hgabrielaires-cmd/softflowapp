
-- Criar tabela contratos
CREATE TABLE public.contratos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  plano_id UUID,
  numero_registro SERIAL,
  numero_exibicao TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Base', -- 'Base' | 'Termo Aditivo'
  status TEXT NOT NULL DEFAULT 'Ativo', -- 'Ativo' | 'Encerrado'
  pedido_id UUID,
  contrato_origem_id UUID, -- referência ao contrato base (para aditivos)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gerar numero_exibicao automaticamente com trigger
CREATE OR REPLACE FUNCTION public.gerar_numero_exibicao_contrato()
RETURNS TRIGGER AS $$
BEGIN
  -- Formato: ANO-SEQUENCIAL (ex: 2025-0100)
  NEW.numero_exibicao := TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.numero_registro::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_numero_exibicao_contrato
  BEFORE INSERT ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_numero_exibicao_contrato();

-- Trigger updated_at
CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia contratos"
  ON public.contratos FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Financeiro visualiza contratos"
  ON public.contratos FOR SELECT
  USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Financeiro gerencia contratos"
  ON public.contratos FOR ALL
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Vendedor visualiza contratos da sua filial"
  ON public.contratos FOR SELECT
  USING (
    has_role(auth.uid(), 'vendedor'::app_role) AND
    cliente_id IN (
      SELECT c.id FROM public.clientes c
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE c.filial_id = p.filial_id
    )
  );

CREATE POLICY "Tecnico visualiza contratos"
  ON public.contratos FOR SELECT
  USING (has_role(auth.uid(), 'tecnico'::app_role));

-- Adicionar tipo_pedido na tabela pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tipo_pedido TEXT NOT NULL DEFAULT 'Novo';
  -- Valores: 'Novo' | 'Upgrade' | 'Aditivo'

-- Adicionar contrato_id no pedido (para aditivos linkarem ao contrato)
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS contrato_id UUID;
