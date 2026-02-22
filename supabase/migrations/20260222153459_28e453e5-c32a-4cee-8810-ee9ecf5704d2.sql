
-- Add fornecedor_id to planos
ALTER TABLE public.planos ADD COLUMN fornecedor_id uuid REFERENCES public.fornecedores(id);

-- Create custos table
CREATE TABLE public.custos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  preco_fornecedor numeric NOT NULL DEFAULT 0,
  imposto_tipo text NOT NULL DEFAULT '%',
  imposto_valor numeric NOT NULL DEFAULT 0,
  imposto_base text NOT NULL DEFAULT 'compra',
  taxa_boleto numeric NOT NULL DEFAULT 0,
  despesas_adicionais numeric NOT NULL DEFAULT 0,
  despesas_adicionais_descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin gerencia custos" ON public.custos FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Autenticados visualizam custos" ON public.custos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE TRIGGER update_custos_updated_at
  BEFORE UPDATE ON public.custos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- One custo per plano
CREATE UNIQUE INDEX custos_plano_id_unique ON public.custos(plano_id);
