
-- Etapas do Painel de Atendimento (configuráveis)
CREATE TABLE public.painel_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  cor TEXT DEFAULT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.painel_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia painel_etapas" ON public.painel_etapas FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam painel_etapas" ON public.painel_etapas FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_painel_etapas_updated_at BEFORE UPDATE ON public.painel_etapas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir etapas padrão
INSERT INTO public.painel_etapas (nome, ordem) VALUES
  ('Onboard', 0),
  ('Validação Técnica', 1),
  ('Agendamento', 2),
  ('Licença Pendente', 3),
  ('Em Execução', 4),
  ('Aguardando Cliente', 5),
  ('Concluído', 6);

-- Cards do Painel de Atendimento
CREATE TABLE public.painel_atendimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id),
  pedido_id UUID REFERENCES public.pedidos(id),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  filial_id UUID NOT NULL REFERENCES public.filiais(id),
  tipo_operacao TEXT NOT NULL,
  plano_id UUID REFERENCES public.planos(id),
  jornada_id UUID REFERENCES public.jornadas(id),
  responsavel_id UUID REFERENCES public.profiles(id),
  etapa_id UUID NOT NULL REFERENCES public.painel_etapas(id),
  sla_horas NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.painel_atendimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia painel_atendimento" ON public.painel_atendimento FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Autenticados visualizam painel_atendimento" ON public.painel_atendimento FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Operacional atualiza painel_atendimento" ON public.painel_atendimento FOR UPDATE USING (has_role(auth.uid(), 'operacional')) WITH CHECK (has_role(auth.uid(), 'operacional'));
CREATE POLICY "Tecnico atualiza painel_atendimento" ON public.painel_atendimento FOR UPDATE USING (has_role(auth.uid(), 'tecnico')) WITH CHECK (has_role(auth.uid(), 'tecnico'));

CREATE TRIGGER update_painel_atendimento_updated_at BEFORE UPDATE ON public.painel_atendimento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar card automaticamente quando contrato é assinado
CREATE OR REPLACE FUNCTION public.criar_card_painel_assinatura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contrato RECORD;
  v_pedido RECORD;
  v_etapa_onboard_id UUID;
  v_tipo_operacao TEXT;
  v_sla NUMERIC;
  v_jornada_id UUID;
  v_existing UUID;
BEGIN
  -- Só dispara quando status muda para 'Assinado'
  IF NEW.status = 'Assinado' AND (OLD.status IS DISTINCT FROM 'Assinado') THEN
    -- Verifica se já existe card para este contrato
    SELECT id INTO v_existing FROM public.painel_atendimento WHERE contrato_id = NEW.contrato_id;
    IF v_existing IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Busca dados do contrato
    SELECT * INTO v_contrato FROM public.contratos WHERE id = NEW.contrato_id;
    IF v_contrato IS NULL THEN RETURN NEW; END IF;

    -- Busca dados do pedido
    IF v_contrato.pedido_id IS NOT NULL THEN
      SELECT * INTO v_pedido FROM public.pedidos WHERE id = v_contrato.pedido_id;
    END IF;

    -- Mapeia tipo_pedido para tipo_operacao
    IF v_pedido IS NOT NULL THEN
      CASE v_pedido.tipo_pedido
        WHEN 'Novo' THEN v_tipo_operacao := 'Implantação';
        WHEN 'Upgrade' THEN v_tipo_operacao := 'Upgrade';
        WHEN 'Módulo Adicional' THEN v_tipo_operacao := 'Módulo Adicional';
        WHEN 'Serviço' THEN v_tipo_operacao := 'Serviço';
        ELSE v_tipo_operacao := v_pedido.tipo_pedido;
      END CASE;
    ELSE
      v_tipo_operacao := CASE v_contrato.tipo
        WHEN 'Base' THEN 'Implantação'
        WHEN 'Termo Aditivo' THEN 'Upgrade'
        ELSE 'Implantação'
      END;
    END IF;

    -- Busca etapa Onboard
    SELECT id INTO v_etapa_onboard_id FROM public.painel_etapas WHERE nome = 'Onboard' AND ativo = true ORDER BY ordem LIMIT 1;
    IF v_etapa_onboard_id IS NULL THEN RETURN NEW; END IF;

    -- Busca jornada vinculada ao plano e calcula SLA
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

    -- Cria o card no painel
    INSERT INTO public.painel_atendimento (
      contrato_id, pedido_id, cliente_id, filial_id,
      tipo_operacao, plano_id, jornada_id, etapa_id, sla_horas
    ) VALUES (
      NEW.contrato_id,
      v_contrato.pedido_id,
      v_contrato.cliente_id,
      COALESCE(
        v_pedido.filial_id,
        (SELECT filial_id FROM public.clientes WHERE id = v_contrato.cliente_id)
      ),
      v_tipo_operacao,
      v_contrato.plano_id,
      v_jornada_id,
      v_etapa_onboard_id,
      v_sla
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger na tabela contratos_zapsign
CREATE TRIGGER trigger_criar_card_painel
AFTER UPDATE ON public.contratos_zapsign
FOR EACH ROW
EXECUTE FUNCTION public.criar_card_painel_assinatura();
