
-- Tabela de faturas
CREATE TABLE public.faturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_fatura TEXT NOT NULL DEFAULT '',
  contrato_id UUID REFERENCES public.contratos(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_desconto NUMERIC NOT NULL DEFAULT 0,
  valor_final NUMERIC NOT NULL DEFAULT 0,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'Pendente',
  forma_pagamento TEXT,
  referencia_mes INTEGER,
  referencia_ano INTEGER,
  tipo TEXT NOT NULL DEFAULT 'Mensalidade',
  gerado_automaticamente BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sequência para número de fatura
CREATE SEQUENCE faturas_numero_seq START 1;

-- Trigger para gerar número de fatura
CREATE OR REPLACE FUNCTION public.gerar_numero_fatura()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.numero_fatura = '' OR NEW.numero_fatura IS NULL THEN
    NEW.numero_fatura := 'FAT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('faturas_numero_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_gerar_numero_fatura
  BEFORE INSERT ON public.faturas
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_numero_fatura();

-- Trigger updated_at
CREATE TRIGGER tr_faturas_updated_at
  BEFORE UPDATE ON public.faturas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de notas fiscais
CREATE TABLE public.notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id UUID REFERENCES public.faturas(id) ON DELETE SET NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL,
  numero_nf TEXT NOT NULL,
  serie TEXT DEFAULT '1',
  valor NUMERIC NOT NULL DEFAULT 0,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Emitida',
  xml_url TEXT,
  pdf_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TRIGGER tr_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_faturas_cliente_id ON public.faturas(cliente_id);
CREATE INDEX idx_faturas_contrato_id ON public.faturas(contrato_id);
CREATE INDEX idx_faturas_filial_id ON public.faturas(filial_id);
CREATE INDEX idx_faturas_status ON public.faturas(status);
CREATE INDEX idx_faturas_data_vencimento ON public.faturas(data_vencimento);
CREATE INDEX idx_notas_fiscais_fatura_id ON public.notas_fiscais(fatura_id);
CREATE INDEX idx_notas_fiscais_cliente_id ON public.notas_fiscais(cliente_id);

-- RLS faturas
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia faturas" ON public.faturas FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Financeiro gerencia faturas" ON public.faturas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro')) WITH CHECK (has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Gestor gerencia faturas" ON public.faturas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor')) WITH CHECK (has_role(auth.uid(), 'gestor'));

CREATE POLICY "Filial filter faturas" ON public.faturas FOR ALL TO authenticated
  USING ((filial_id IS NULL) OR user_has_filial_access(filial_id))
  WITH CHECK ((filial_id IS NULL) OR user_has_filial_access(filial_id));

CREATE POLICY "Vendedor visualiza faturas" ON public.faturas FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendedor'));

CREATE POLICY "Operacional visualiza faturas" ON public.faturas FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operacional'));

-- RLS notas_fiscais
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia notas_fiscais" ON public.notas_fiscais FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Financeiro gerencia notas_fiscais" ON public.notas_fiscais FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro')) WITH CHECK (has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Gestor gerencia notas_fiscais" ON public.notas_fiscais FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor')) WITH CHECK (has_role(auth.uid(), 'gestor'));

CREATE POLICY "Filial filter notas_fiscais" ON public.notas_fiscais FOR ALL TO authenticated
  USING ((filial_id IS NULL) OR user_has_filial_access(filial_id))
  WITH CHECK ((filial_id IS NULL) OR user_has_filial_access(filial_id));

CREATE POLICY "Vendedor visualiza notas_fiscais" ON public.notas_fiscais FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendedor'));
