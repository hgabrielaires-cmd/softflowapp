ALTER TABLE public.filial_parametros
  ADD COLUMN IF NOT EXISTS taxa_boleto_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxa_boleto_tipo text NOT NULL DEFAULT 'fixo',
  ADD COLUMN IF NOT EXISTS taxa_boleto_valor numeric(10,2) NOT NULL DEFAULT 3.50,
  ADD COLUMN IF NOT EXISTS taxa_boleto_percentual numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_boleto_plano_conta_id uuid REFERENCES public.fin_plano_contas(id);

INSERT INTO public.filial_parametros (filial_id, taxa_boleto_ativo, taxa_boleto_tipo, taxa_boleto_valor, taxa_boleto_plano_conta_id)
SELECT f.id, true, 'fixo', 3.50, (SELECT id FROM public.fin_plano_contas WHERE codigo = '3.04' LIMIT 1)
FROM public.filiais f WHERE f.ativa = true
ON CONFLICT (filial_id) DO UPDATE
SET taxa_boleto_ativo = true,
    taxa_boleto_tipo = 'fixo',
    taxa_boleto_valor = 3.50,
    taxa_boleto_plano_conta_id = COALESCE(public.filial_parametros.taxa_boleto_plano_conta_id, (SELECT id FROM public.fin_plano_contas WHERE codigo = '3.04' LIMIT 1));

CREATE OR REPLACE FUNCTION public.fn_reprocessar_taxas_boleto(p_filial_id uuid, p_mes int, p_ano int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config record;
  v_mov record;
  v_taxa numeric;
  v_conta_azul_id uuid;
  v_criados int := 0;
  v_ignorados int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'financeiro')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO v_config FROM public.filial_parametros WHERE filial_id = p_filial_id;
  IF NOT FOUND OR NOT v_config.taxa_boleto_ativo OR v_config.taxa_boleto_plano_conta_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Taxa não configurada para esta filial');
  END IF;

  SELECT id INTO v_conta_azul_id FROM public.fin_contas_financeiras
  WHERE nome ILIKE '%conta azul%' AND ativo = true LIMIT 1;
  IF v_conta_azul_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Conta financeira CONTA AZUL não encontrada');
  END IF;

  FOR v_mov IN
    SELECT * FROM public.fin_movimentacoes
    WHERE filial_id = p_filial_id
      AND conta_financeira_id = v_conta_azul_id
      AND tipo = 'entrada'
      AND origem = 'contaazul'
      AND EXTRACT(MONTH FROM data_movimentacao) = p_mes
      AND EXTRACT(YEAR FROM data_movimentacao) = p_ano
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.fin_movimentacoes
      WHERE origem = 'taxa_boleto_contaazul' AND origem_id = v_mov.origem_id
    ) THEN
      v_ignorados := v_ignorados + 1;
      CONTINUE;
    END IF;

    IF v_config.taxa_boleto_tipo = 'fixo' THEN
      v_taxa := v_config.taxa_boleto_valor;
    ELSIF v_config.taxa_boleto_tipo = 'percentual' THEN
      v_taxa := ROUND(v_mov.valor * (v_config.taxa_boleto_percentual / 100), 2);
    ELSE
      v_taxa := ROUND(v_config.taxa_boleto_valor + v_mov.valor * (v_config.taxa_boleto_percentual / 100), 2);
    END IF;

    IF COALESCE(v_taxa, 0) <= 0 THEN
      v_ignorados := v_ignorados + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.fin_movimentacoes (
      conta_financeira_id, filial_id, tipo, valor, data_movimentacao,
      descricao, categoria, plano_conta_id, origem, origem_id
    ) VALUES (
      v_conta_azul_id, p_filial_id, 'saida', v_taxa, v_mov.data_movimentacao,
      'Taxa Boleto ' || COALESCE(v_mov.descricao, ''), 'taxa_bancaria',
      v_config.taxa_boleto_plano_conta_id, 'taxa_boleto_contaazul', v_mov.origem_id
    );
    v_criados := v_criados + 1;
  END LOOP;

  RETURN jsonb_build_object('taxas_criadas', v_criados, 'ignoradas', v_ignorados);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_reprocessar_taxas_boleto(uuid, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_reprocessar_taxas_boleto(uuid, int, int) TO authenticated;