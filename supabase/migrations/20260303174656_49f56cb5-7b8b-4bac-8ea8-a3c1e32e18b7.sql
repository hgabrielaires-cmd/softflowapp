
-- 1. Função centralizada: verifica se o usuário tem acesso a uma filial
CREATE OR REPLACE FUNCTION public.user_has_filial_access(_filial_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- acesso_global libera tudo
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND acesso_global = true
    )
    OR
    -- vinculado via usuario_filiais
    EXISTS (
      SELECT 1 FROM public.usuario_filiais
      WHERE user_id = auth.uid() AND filial_id = _filial_id
    )
$$;

-- 2. Políticas RESTRICTIVE por filial em todas as tabelas de dados

-- CLIENTES (filial_id direto, nullable → NULL = visível a todos)
CREATE POLICY "Filial filter clientes"
ON public.clientes AS RESTRICTIVE
FOR ALL TO authenticated
USING (filial_id IS NULL OR public.user_has_filial_access(filial_id))
WITH CHECK (filial_id IS NULL OR public.user_has_filial_access(filial_id));

-- CLIENTE_CONTATOS (via clientes)
CREATE POLICY "Filial filter cliente_contatos"
ON public.cliente_contatos AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_contatos.cliente_id
    AND (c.filial_id IS NULL OR public.user_has_filial_access(c.filial_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_contatos.cliente_id
    AND (c.filial_id IS NULL OR public.user_has_filial_access(c.filial_id))
  )
);

-- PEDIDOS (filial_id direto)
CREATE POLICY "Filial filter pedidos"
ON public.pedidos AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.user_has_filial_access(filial_id))
WITH CHECK (public.user_has_filial_access(filial_id));

-- PEDIDO_COMENTARIOS (via pedidos)
CREATE POLICY "Filial filter pedido_comentarios"
ON public.pedido_comentarios AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_comentarios.pedido_id
    AND public.user_has_filial_access(p.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_comentarios.pedido_id
    AND public.user_has_filial_access(p.filial_id)
  )
);

-- PEDIDO_CURTIDAS (via pedido_comentarios → pedidos)
CREATE POLICY "Filial filter pedido_curtidas"
ON public.pedido_curtidas AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pedido_comentarios pc
    JOIN public.pedidos p ON p.id = pc.pedido_id
    WHERE pc.id = pedido_curtidas.comentario_id
    AND public.user_has_filial_access(p.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedido_comentarios pc
    JOIN public.pedidos p ON p.id = pc.pedido_id
    WHERE pc.id = pedido_curtidas.comentario_id
    AND public.user_has_filial_access(p.filial_id)
  )
);

-- CONTRATOS (via clientes.filial_id ou pedidos.filial_id)
CREATE POLICY "Filial filter contratos"
ON public.contratos AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = contratos.cliente_id
    AND (c.filial_id IS NULL OR public.user_has_filial_access(c.filial_id))
  )
  OR EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = contratos.pedido_id
    AND public.user_has_filial_access(p.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = contratos.cliente_id
    AND (c.filial_id IS NULL OR public.user_has_filial_access(c.filial_id))
  )
  OR EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = contratos.pedido_id
    AND public.user_has_filial_access(p.filial_id)
  )
);

-- CONTRATOS_ZAPSIGN (via contratos → clientes)
CREATE POLICY "Filial filter contratos_zapsign"
ON public.contratos_zapsign AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contratos ct
    JOIN public.clientes c ON c.id = ct.cliente_id
    WHERE ct.id = contratos_zapsign.contrato_id
    AND (c.filial_id IS NULL OR public.user_has_filial_access(c.filial_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contratos ct
    JOIN public.clientes c ON c.id = ct.cliente_id
    WHERE ct.id = contratos_zapsign.contrato_id
    AND (c.filial_id IS NULL OR public.user_has_filial_access(c.filial_id))
  )
);

-- PAINEL_ATENDIMENTO (filial_id direto)
CREATE POLICY "Filial filter painel_atendimento"
ON public.painel_atendimento AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.user_has_filial_access(filial_id))
WITH CHECK (public.user_has_filial_access(filial_id));

-- PAINEL_AGENDAMENTOS (via painel_atendimento)
CREATE POLICY "Filial filter painel_agendamentos"
ON public.painel_agendamentos AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_agendamentos.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_agendamentos.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);

-- PAINEL_COMENTARIOS (via painel_atendimento)
CREATE POLICY "Filial filter painel_comentarios"
ON public.painel_comentarios AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_comentarios.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_comentarios.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);

-- PAINEL_CURTIDAS (via painel_comentarios → painel_atendimento)
CREATE POLICY "Filial filter painel_curtidas"
ON public.painel_curtidas AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_comentarios pc
    JOIN public.painel_atendimento pa ON pa.id = pc.card_id
    WHERE pc.id = painel_curtidas.comentario_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_comentarios pc
    JOIN public.painel_atendimento pa ON pa.id = pc.card_id
    WHERE pc.id = painel_curtidas.comentario_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);

-- PAINEL_HISTORICO_ETAPAS (via painel_atendimento)
CREATE POLICY "Filial filter painel_historico_etapas"
ON public.painel_historico_etapas AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_historico_etapas.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_historico_etapas.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);

-- PAINEL_CHECKLIST_PROGRESSO (via painel_atendimento)
CREATE POLICY "Filial filter painel_checklist_progresso"
ON public.painel_checklist_progresso AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_checklist_progresso.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_checklist_progresso.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);

-- PAINEL_TECNICOS (via painel_atendimento)
CREATE POLICY "Filial filter painel_tecnicos"
ON public.painel_tecnicos AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_tecnicos.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_tecnicos.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);

-- PAINEL_APONTAMENTOS (via painel_atendimento)
CREATE POLICY "Filial filter painel_apontamentos"
ON public.painel_apontamentos AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_apontamentos.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_apontamentos.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);

-- PAINEL_MENCOES (via painel_atendimento)
CREATE POLICY "Filial filter painel_mencoes"
ON public.painel_mencoes AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_mencoes.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_mencoes.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);

-- PAINEL_ALERTAS_ENVIADOS (via painel_atendimento)
CREATE POLICY "Filial filter painel_alertas_enviados"
ON public.painel_alertas_enviados AS RESTRICTIVE
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_alertas_enviados.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.painel_atendimento pa
    WHERE pa.id = painel_alertas_enviados.card_id
    AND public.user_has_filial_access(pa.filial_id)
  )
);
