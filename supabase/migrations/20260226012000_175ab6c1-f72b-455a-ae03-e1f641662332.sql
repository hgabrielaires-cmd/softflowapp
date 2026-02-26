
-- Fix: Map tipo_pedido 'Aditivo' to 'Módulo Adicional' and contract tipo 'Aditivo' fallback
CREATE OR REPLACE FUNCTION public.criar_card_painel_assinatura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato RECORD;
  v_pedido RECORD;
  v_etapa_id UUID;
  v_filial_id UUID;
  v_tipo_operacao TEXT;
  v_sla NUMERIC;
  v_jornada_id UUID;
  v_existing UUID;
BEGIN
  IF NEW.status = 'Assinado' AND (OLD.status IS DISTINCT FROM 'Assinado') THEN
    SELECT id INTO v_existing FROM public.painel_atendimento WHERE contrato_id = NEW.contrato_id;
    IF v_existing IS NOT NULL THEN RETURN NEW; END IF;

    SELECT * INTO v_contrato FROM public.contratos WHERE id = NEW.contrato_id;
    IF v_contrato IS NULL THEN RETURN NEW; END IF;

    IF v_contrato.pedido_id IS NOT NULL THEN
      SELECT * INTO v_pedido FROM public.pedidos WHERE id = v_contrato.pedido_id;
    END IF;

    v_filial_id := COALESCE(
      v_pedido.filial_id,
      (SELECT filial_id FROM public.clientes WHERE id = v_contrato.cliente_id)
    );

    IF v_filial_id IS NOT NULL THEN
      SELECT etapa_inicial_id INTO v_etapa_id FROM public.filiais WHERE id = v_filial_id;
    END IF;

    IF v_etapa_id IS NULL THEN
      SELECT id INTO v_etapa_id FROM public.painel_etapas WHERE ativo = true ORDER BY ordem LIMIT 1;
    END IF;

    IF v_etapa_id IS NULL THEN RETURN NEW; END IF;

    -- Map tipo_pedido to tipo_operacao
    IF v_pedido IS NOT NULL THEN
      CASE v_pedido.tipo_pedido
        WHEN 'Novo' THEN v_tipo_operacao := 'Implantação';
        WHEN 'Upgrade' THEN v_tipo_operacao := 'Upgrade';
        WHEN 'Aditivo' THEN v_tipo_operacao := 'Módulo Adicional';
        WHEN 'Módulo Adicional' THEN v_tipo_operacao := 'Módulo Adicional';
        WHEN 'Serviço' THEN v_tipo_operacao := 'Serviço';
        WHEN 'OA' THEN v_tipo_operacao := 'Ordem de Atendimento';
        ELSE v_tipo_operacao := v_pedido.tipo_pedido;
      END CASE;
    ELSE
      v_tipo_operacao := CASE v_contrato.tipo
        WHEN 'Base' THEN 'Implantação'
        WHEN 'Aditivo' THEN 'Módulo Adicional'
        WHEN 'OA' THEN 'Ordem de Atendimento'
        WHEN 'Cancelamento' THEN 'Cancelamento'
        ELSE 'Implantação'
      END;
    END IF;

    v_sla := 0;
    v_jornada_id := NULL;
    IF v_contrato.plano_id IS NOT NULL THEN
      SELECT j.id INTO v_jornada_id FROM public.jornadas j WHERE j.vinculo_tipo = 'plano' AND j.vinculo_id = v_contrato.plano_id AND j.ativo = true LIMIT 1;
      IF v_jornada_id IS NOT NULL THEN
        SELECT COALESCE(SUM(a.horas_estimadas), 0) INTO v_sla
        FROM public.jornada_etapas e
        JOIN public.jornada_atividades a ON a.etapa_id = e.id
        WHERE e.jornada_id = v_jornada_id;
      END IF;
    END IF;

    INSERT INTO public.painel_atendimento (
      contrato_id, pedido_id, cliente_id, filial_id,
      tipo_operacao, plano_id, jornada_id, etapa_id, sla_horas
    ) VALUES (
      NEW.contrato_id,
      v_contrato.pedido_id,
      v_contrato.cliente_id,
      v_filial_id,
      v_tipo_operacao,
      v_contrato.plano_id,
      v_jornada_id,
      v_etapa_id,
      v_sla
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Fix the existing card for AD-0030
UPDATE public.painel_atendimento 
SET tipo_operacao = 'Módulo Adicional'
WHERE id = '3a69bbff-0bb6-45e5-b093-ff95fecc666b';
