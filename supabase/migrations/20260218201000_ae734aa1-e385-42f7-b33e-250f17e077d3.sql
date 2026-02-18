-- Passo 4: Adicionar campos de aprovação do financeiro na tabela pedidos

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS financeiro_status TEXT NOT NULL DEFAULT 'Aguardando',
  ADD COLUMN IF NOT EXISTS financeiro_motivo TEXT,
  ADD COLUMN IF NOT EXISTS financeiro_aprovado_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS financeiro_aprovado_por UUID,
  ADD COLUMN IF NOT EXISTS contrato_liberado BOOLEAN NOT NULL DEFAULT false;

-- Garantir que pedidos existentes fiquem com status correto
UPDATE public.pedidos
SET financeiro_status = 'Aguardando', contrato_liberado = false
WHERE financeiro_status IS NULL OR financeiro_status = '';

-- Política de UPDATE para financeiro aprovar/reprovar pedidos
CREATE POLICY "Financeiro pode atualizar status financeiro"
  ON public.pedidos
  FOR UPDATE
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

-- Vendedor pode editar pedido reprovado para reenviar
CREATE POLICY "Vendedor pode editar pedido reprovado"
  ON public.pedidos
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND vendedor_id = auth.uid()
    AND financeiro_status = 'Reprovado'
  )
  WITH CHECK (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND vendedor_id = auth.uid()
  );