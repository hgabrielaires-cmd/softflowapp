CREATE TABLE public.fin_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_financeira_id uuid NOT NULL REFERENCES public.fin_contas_financeiras(id),
  filial_id uuid REFERENCES public.filiais(id),
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','transferencia')),
  valor numeric(12,2) NOT NULL,
  data_movimentacao date NOT NULL DEFAULT CURRENT_DATE,
  descricao text,
  categoria text,
  plano_conta_id uuid REFERENCES public.fin_plano_contas(id),
  origem text DEFAULT 'manual',
  origem_id uuid,
  conta_destino_id uuid REFERENCES public.fin_contas_financeiras(id),
  anexo_url text,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_movimentacoes TO authenticated;
GRANT ALL ON public.fin_movimentacoes TO service_role;

ALTER TABLE public.fin_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Financeiro pode ver movimentacoes"
ON public.fin_movimentacoes FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'gestor'));

CREATE POLICY "Financeiro pode inserir movimentacoes"
ON public.fin_movimentacoes FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro'));

CREATE POLICY "Financeiro pode atualizar movimentacoes"
ON public.fin_movimentacoes FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro'));

CREATE POLICY "Financeiro pode excluir movimentacoes"
ON public.fin_movimentacoes FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro'));

CREATE INDEX idx_fin_mov_conta ON public.fin_movimentacoes(conta_financeira_id);
CREATE INDEX idx_fin_mov_data ON public.fin_movimentacoes(data_movimentacao);
CREATE INDEX idx_fin_mov_filial ON public.fin_movimentacoes(filial_id);
CREATE UNIQUE INDEX uniq_fin_mov_origem ON public.fin_movimentacoes(origem, origem_id) WHERE origem_id IS NOT NULL;

CREATE TRIGGER tr_fin_movimentacoes_updated_at
BEFORE UPDATE ON public.fin_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.fn_despesa_gera_movimentacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'pago' AND NEW.data_pagamento IS NOT NULL AND NEW.conta_financeira_id IS NOT NULL THEN
    INSERT INTO public.fin_movimentacoes (
      conta_financeira_id, filial_id, tipo, valor, data_movimentacao,
      descricao, categoria, origem, origem_id, plano_conta_id, anexo_url, created_by
    ) VALUES (
      NEW.conta_financeira_id, NEW.filial_id, 'saida',
      COALESCE(NEW.valor_pago, NEW.valor), NEW.data_pagamento,
      NEW.descricao, 'despesa', 'despesa', NEW.id, NEW.plano_conta_id, NEW.anexo_url, NEW.created_by
    )
    ON CONFLICT (origem, origem_id) WHERE origem_id IS NOT NULL
    DO UPDATE SET
      conta_financeira_id = EXCLUDED.conta_financeira_id,
      filial_id = EXCLUDED.filial_id,
      valor = EXCLUDED.valor,
      data_movimentacao = EXCLUDED.data_movimentacao,
      descricao = EXCLUDED.descricao,
      plano_conta_id = EXCLUDED.plano_conta_id,
      anexo_url = EXCLUDED.anexo_url,
      updated_at = now();
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> 'pago' THEN
    DELETE FROM public.fin_movimentacoes WHERE origem = 'despesa' AND origem_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_despesa_movimentacao
AFTER INSERT OR UPDATE ON public.fin_despesas
FOR EACH ROW EXECUTE FUNCTION public.fn_despesa_gera_movimentacao();

CREATE OR REPLACE FUNCTION public.fn_saldo_conta(p_conta_id uuid, p_data date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_saldo_inicial numeric;
  v_entradas numeric;
  v_saidas numeric;
BEGIN
  SELECT COALESCE(saldo_inicial, 0) INTO v_saldo_inicial
  FROM public.fin_contas_financeiras WHERE id = p_conta_id;

  SELECT COALESCE(SUM(valor), 0) INTO v_entradas
  FROM public.fin_movimentacoes
  WHERE conta_financeira_id = p_conta_id AND tipo = 'entrada' AND data_movimentacao <= p_data;

  SELECT COALESCE(SUM(valor), 0) INTO v_saidas
  FROM public.fin_movimentacoes
  WHERE conta_financeira_id = p_conta_id AND tipo = 'saida' AND data_movimentacao <= p_data;

  v_saidas := v_saidas + COALESCE((
    SELECT SUM(valor) FROM public.fin_movimentacoes
    WHERE conta_financeira_id = p_conta_id AND tipo = 'transferencia' AND data_movimentacao <= p_data), 0);

  v_entradas := v_entradas + COALESCE((
    SELECT SUM(valor) FROM public.fin_movimentacoes
    WHERE conta_destino_id = p_conta_id AND tipo = 'transferencia' AND data_movimentacao <= p_data), 0);

  RETURN COALESCE(v_saldo_inicial,0) + v_entradas - v_saidas;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.fin_movimentacoes;