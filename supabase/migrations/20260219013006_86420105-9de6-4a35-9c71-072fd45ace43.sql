
-- 1. Adicionar colunas de limite de desconto e flag de gestor de desconto no profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS desconto_limite_implantacao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_limite_mensalidade numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gestor_desconto boolean DEFAULT false;

-- 2. Criar tabela de solicitações de aprovação de desconto
CREATE TABLE IF NOT EXISTS public.solicitacoes_desconto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL,
  desconto_implantacao_tipo text NOT NULL DEFAULT 'R$',
  desconto_implantacao_valor numeric NOT NULL DEFAULT 0,
  desconto_mensalidade_tipo text NOT NULL DEFAULT 'R$',
  desconto_mensalidade_valor numeric NOT NULL DEFAULT 0,
  desconto_implantacao_percentual numeric NOT NULL DEFAULT 0,
  desconto_mensalidade_percentual numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Aguardando' CHECK (status IN ('Aguardando', 'Aprovado', 'Reprovado')),
  aprovado_por uuid,
  aprovado_em timestamptz,
  motivo_reprovacao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Trigger de updated_at
CREATE TRIGGER update_solicitacoes_desconto_updated_at
  BEFORE UPDATE ON public.solicitacoes_desconto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Habilitar RLS
ALTER TABLE public.solicitacoes_desconto ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS

-- Admin gerencia tudo
CREATE POLICY "Admin gerencia solicitacoes desconto"
  ON public.solicitacoes_desconto
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Vendedor vê suas próprias solicitações
CREATE POLICY "Vendedor vê suas solicitações de desconto"
  ON public.solicitacoes_desconto
  FOR SELECT
  USING (auth.uid() = vendedor_id);

-- Vendedor cria suas próprias solicitações
CREATE POLICY "Vendedor cria solicitação de desconto"
  ON public.solicitacoes_desconto
  FOR INSERT
  WITH CHECK (auth.uid() = vendedor_id);

-- Gestor de desconto vê todas as solicitações pendentes
CREATE POLICY "Gestor visualiza solicitações de desconto"
  ON public.solicitacoes_desconto
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND gestor_desconto = true
    )
  );

-- Gestor aprova/reprova solicitações
CREATE POLICY "Gestor atualiza solicitações de desconto"
  ON public.solicitacoes_desconto
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND gestor_desconto = true
    )
  );

-- 6. Adicionar novo status de pedido para aguardar aprovação de desconto
-- (o campo status_pedido é text, sem constraint, ok)
