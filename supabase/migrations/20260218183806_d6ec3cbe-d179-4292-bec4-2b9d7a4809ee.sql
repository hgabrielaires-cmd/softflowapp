
-- Add comissao_percentual to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS comissao_percentual numeric(5,2) DEFAULT 5;

-- Create pedidos table
CREATE TABLE public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  vendedor_id uuid NOT NULL,
  filial_id uuid NOT NULL REFERENCES public.filiais(id),
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  valor_implantacao numeric(10,2) NOT NULL DEFAULT 0,
  valor_mensalidade numeric(10,2) NOT NULL DEFAULT 0,
  valor_total numeric(10,2) NOT NULL DEFAULT 0,
  comissao_percentual numeric(5,2) NOT NULL DEFAULT 0,
  comissao_valor numeric(10,2) NOT NULL DEFAULT 0,
  status_pedido text NOT NULL DEFAULT 'Aguardando Financeiro' CHECK (status_pedido IN ('Aguardando Financeiro', 'Cancelado')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
CREATE POLICY "Admin gerencia pedidos"
  ON public.pedidos FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Financeiro visualiza pedidos"
  ON public.pedidos FOR SELECT
  USING (has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Vendedor visualiza pedidos da sua filial"
  ON public.pedidos FOR SELECT
  USING (
    has_role(auth.uid(), 'vendedor') AND
    filial_id = (SELECT profiles.filial_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Vendedor cria pedidos na sua filial"
  ON public.pedidos FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'vendedor') AND
    filial_id = (SELECT profiles.filial_id FROM profiles WHERE profiles.user_id = auth.uid() LIMIT 1) AND
    vendedor_id = auth.uid()
  );
