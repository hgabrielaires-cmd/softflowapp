
-- Tabela principal: contrato financeiro vinculado a um contrato assinado
CREATE TABLE public.contratos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  contrato_base_id UUID REFERENCES public.contratos_financeiros(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  plano_id UUID REFERENCES public.planos(id) ON DELETE SET NULL,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'Contrato Inicial',
  valor_mensalidade NUMERIC NOT NULL DEFAULT 0,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  forma_pagamento TEXT NOT NULL DEFAULT 'Boleto',
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_implantacao NUMERIC NOT NULL DEFAULT 0,
  parcelas_implantacao INTEGER NOT NULL DEFAULT 1,
  parcelas_pagas INTEGER NOT NULL DEFAULT 0,
  email_cobranca TEXT,
  whatsapp_cobranca TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contrato_id)
);

-- Módulos adicionais vinculados ao contrato financeiro
CREATE TABLE public.contrato_financeiro_modulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_financeiro_id UUID NOT NULL REFERENCES public.contratos_financeiros(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor_mensal NUMERIC NOT NULL DEFAULT 0,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAs vinculadas ao contrato financeiro
CREATE TABLE public.contrato_financeiro_oas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_financeiro_id UUID NOT NULL REFERENCES public.contratos_financeiros(id) ON DELETE CASCADE,
  contrato_oa_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  mes_referencia INTEGER NOT NULL,
  ano_referencia INTEGER NOT NULL,
  faturada BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER tr_contratos_financeiros_updated_at
  BEFORE UPDATE ON public.contratos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_contratos_financeiros_contrato_id ON public.contratos_financeiros(contrato_id);
CREATE INDEX idx_contratos_financeiros_cliente_id ON public.contratos_financeiros(cliente_id);
CREATE INDEX idx_contratos_financeiros_contrato_base_id ON public.contratos_financeiros(contrato_base_id);
CREATE INDEX idx_contrato_financeiro_modulos_cf_id ON public.contrato_financeiro_modulos(contrato_financeiro_id);
CREATE INDEX idx_contrato_financeiro_oas_cf_id ON public.contrato_financeiro_oas(contrato_financeiro_id);

-- RLS
ALTER TABLE public.contratos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_financeiro_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_financeiro_oas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage contratos_financeiros"
  ON public.contratos_financeiros FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage contrato_financeiro_modulos"
  ON public.contrato_financeiro_modulos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage contrato_financeiro_oas"
  ON public.contrato_financeiro_oas FOR ALL TO authenticated USING (true) WITH CHECK (true);
