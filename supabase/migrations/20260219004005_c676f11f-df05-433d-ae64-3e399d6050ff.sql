
-- ─── 1. Tabela: cliente_contatos ─────────────────────────────────────────────
CREATE TABLE public.cliente_contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  telefone text,
  email text,
  decisor boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia contatos"
  ON public.cliente_contatos FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Financeiro gerencia contatos"
  ON public.cliente_contatos FOR ALL
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Vendedor visualiza contatos da sua filial"
  ON public.cliente_contatos FOR SELECT
  USING (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE c.filial_id = p.filial_id
    )
  );

CREATE POLICY "Vendedor gerencia contatos da sua filial"
  ON public.cliente_contatos FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE c.filial_id = p.filial_id
    )
  );

CREATE POLICY "Vendedor edita contatos da sua filial"
  ON public.cliente_contatos FOR UPDATE
  USING (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE c.filial_id = p.filial_id
    )
  );

CREATE POLICY "Tecnico visualiza contatos"
  ON public.cliente_contatos FOR SELECT
  USING (has_role(auth.uid(), 'tecnico'::app_role));

CREATE TRIGGER update_cliente_contatos_updated_at
  BEFORE UPDATE ON public.cliente_contatos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 2. Tabela: filial_parametros ────────────────────────────────────────────
CREATE TABLE public.filial_parametros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_id uuid NOT NULL UNIQUE REFERENCES public.filiais(id) ON DELETE CASCADE,
  parcelas_maximas_cartao integer NOT NULL DEFAULT 12,
  pix_desconto_percentual numeric NOT NULL DEFAULT 0,
  regras_padrao_implantacao text,
  regras_padrao_mensalidade text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.filial_parametros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia parametros filial"
  ON public.filial_parametros FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam parametros filial"
  ON public.filial_parametros FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_filial_parametros_updated_at
  BEFORE UPDATE ON public.filial_parametros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 3. Colunas de forma de pagamento na tabela pedidos ──────────────────────
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS pagamento_mensalidade_forma text,
  ADD COLUMN IF NOT EXISTS pagamento_mensalidade_parcelas integer,
  ADD COLUMN IF NOT EXISTS pagamento_mensalidade_desconto_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pagamento_mensalidade_observacao text,
  ADD COLUMN IF NOT EXISTS pagamento_implantacao_forma text,
  ADD COLUMN IF NOT EXISTS pagamento_implantacao_parcelas integer,
  ADD COLUMN IF NOT EXISTS pagamento_implantacao_desconto_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pagamento_implantacao_observacao text;
