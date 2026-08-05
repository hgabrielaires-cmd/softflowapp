-- 1. Chat config tables: scope to filial
DROP POLICY IF EXISTS "Authenticated users can view chat_bot_fluxo" ON public.chat_bot_fluxo;
DROP POLICY IF EXISTS "Authenticated users can insert chat_bot_fluxo" ON public.chat_bot_fluxo;
DROP POLICY IF EXISTS "Authenticated users can update chat_bot_fluxo" ON public.chat_bot_fluxo;
DROP POLICY IF EXISTS "Authenticated users can delete chat_bot_fluxo" ON public.chat_bot_fluxo;
CREATE POLICY "chat_bot_fluxo_filial_select" ON public.chat_bot_fluxo FOR SELECT TO authenticated
  USING (filial_id IS NULL OR public.user_has_filial_access(filial_id));
CREATE POLICY "chat_bot_fluxo_filial_write" ON public.chat_bot_fluxo FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)));
CREATE POLICY "chat_bot_fluxo_filial_update" ON public.chat_bot_fluxo FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)));
CREATE POLICY "chat_bot_fluxo_filial_delete" ON public.chat_bot_fluxo FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)));

DROP POLICY IF EXISTS "Authenticated users can view chat_configuracoes" ON public.chat_configuracoes;
DROP POLICY IF EXISTS "Authenticated users can insert chat_configuracoes" ON public.chat_configuracoes;
DROP POLICY IF EXISTS "Authenticated users can update chat_configuracoes" ON public.chat_configuracoes;
CREATE POLICY "chat_configuracoes_filial_select" ON public.chat_configuracoes FOR SELECT TO authenticated
  USING (filial_id IS NULL OR public.user_has_filial_access(filial_id));
CREATE POLICY "chat_configuracoes_filial_insert" ON public.chat_configuracoes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)));
CREATE POLICY "chat_configuracoes_filial_update" ON public.chat_configuracoes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)));

DROP POLICY IF EXISTS "Authenticated users can view chat_respostas_rapidas" ON public.chat_respostas_rapidas;
DROP POLICY IF EXISTS "Authenticated users can insert chat_respostas_rapidas" ON public.chat_respostas_rapidas;
DROP POLICY IF EXISTS "Authenticated users can update chat_respostas_rapidas" ON public.chat_respostas_rapidas;
DROP POLICY IF EXISTS "Authenticated users can delete chat_respostas_rapidas" ON public.chat_respostas_rapidas;
CREATE POLICY "chat_respostas_rapidas_select" ON public.chat_respostas_rapidas FOR SELECT TO authenticated
  USING (filial_id IS NULL OR public.user_has_filial_access(filial_id));
CREATE POLICY "chat_respostas_rapidas_insert" ON public.chat_respostas_rapidas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)));
CREATE POLICY "chat_respostas_rapidas_update" ON public.chat_respostas_rapidas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)));
CREATE POLICY "chat_respostas_rapidas_delete" ON public.chat_respostas_rapidas FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id)));

DROP POLICY IF EXISTS "Authenticated users can manage cobranca_config" ON public.cobranca_config;
DROP POLICY IF EXISTS "Authenticated users can view cobranca_config" ON public.cobranca_config;
CREATE POLICY "cobranca_config_select" ON public.cobranca_config FOR SELECT TO authenticated
  USING (
    (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND (filial_id IS NULL OR public.user_has_filial_access(filial_id))
  );
CREATE POLICY "cobranca_config_manage" ON public.cobranca_config FOR ALL TO authenticated
  USING (
    (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND (filial_id IS NULL OR public.user_has_filial_access(filial_id))
  )
  WITH CHECK (
    (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND (filial_id IS NULL OR public.user_has_filial_access(filial_id))
  );

-- 2. chat_conversas / chat_fila: filial scoped
DROP POLICY IF EXISTS "Authenticated users can view chat_conversas" ON public.chat_conversas;
DROP POLICY IF EXISTS "Authenticated users can insert chat_conversas" ON public.chat_conversas;
DROP POLICY IF EXISTS "Authenticated users can update chat_conversas" ON public.chat_conversas;
CREATE POLICY "chat_conversas_scoped_select" ON public.chat_conversas FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR atendente_id = auth.uid()
    OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id))
    OR EXISTS (SELECT 1 FROM public.chat_conversa_atendentes ca WHERE ca.conversa_id = chat_conversas.id AND ca.user_id = auth.uid())
  );
CREATE POLICY "chat_conversas_scoped_insert" ON public.chat_conversas FOR INSERT TO authenticated
  WITH CHECK (filial_id IS NULL OR public.user_has_filial_access(filial_id) OR public.is_admin(auth.uid()));
CREATE POLICY "chat_conversas_scoped_update" ON public.chat_conversas FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR atendente_id = auth.uid()
    OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id))
    OR EXISTS (SELECT 1 FROM public.chat_conversa_atendentes ca WHERE ca.conversa_id = chat_conversas.id AND ca.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR atendente_id = auth.uid()
    OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id))
    OR EXISTS (SELECT 1 FROM public.chat_conversa_atendentes ca WHERE ca.conversa_id = chat_conversas.id AND ca.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can view chat_fila" ON public.chat_fila;
DROP POLICY IF EXISTS "Authenticated users can insert chat_fila" ON public.chat_fila;
DROP POLICY IF EXISTS "Authenticated users can update chat_fila" ON public.chat_fila;
CREATE POLICY "chat_fila_scoped_select" ON public.chat_fila FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR atribuido_a = auth.uid()
    OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id))
    OR EXISTS (SELECT 1 FROM public.chat_conversas c WHERE c.id = chat_fila.conversa_id)
  );
CREATE POLICY "chat_fila_scoped_insert" ON public.chat_fila FOR INSERT TO authenticated
  WITH CHECK (filial_id IS NULL OR public.user_has_filial_access(filial_id) OR public.is_admin(auth.uid()));
CREATE POLICY "chat_fila_scoped_update" ON public.chat_fila FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR atribuido_a = auth.uid()
    OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id))
    OR EXISTS (SELECT 1 FROM public.chat_conversas c WHERE c.id = chat_fila.conversa_id)
  )
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR atribuido_a = auth.uid()
    OR (filial_id IS NOT NULL AND public.user_has_filial_access(filial_id))
    OR EXISTS (SELECT 1 FROM public.chat_conversas c WHERE c.id = chat_fila.conversa_id)
  );

-- 3. chat_conversa_atendentes: no self-add
DROP POLICY IF EXISTS "Autenticados gerenciam colaboradores" ON public.chat_conversa_atendentes;
CREATE POLICY "chat_conversa_atendentes_select" ON public.chat_conversa_atendentes FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR EXISTS (SELECT 1 FROM public.chat_conversas c WHERE c.id = conversa_id)
  );
CREATE POLICY "chat_conversa_atendentes_insert" ON public.chat_conversa_atendentes FOR INSERT TO authenticated
  WITH CHECK (
    convidado_por = auth.uid()
    AND user_id <> auth.uid()
    AND (
      public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'gestor'::app_role)
      OR EXISTS (SELECT 1 FROM public.chat_conversas c WHERE c.id = conversa_id AND c.atendente_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.chat_conversa_atendentes ca WHERE ca.conversa_id = chat_conversa_atendentes.conversa_id AND ca.user_id = auth.uid())
    )
  );
CREATE POLICY "chat_conversa_atendentes_delete" ON public.chat_conversa_atendentes FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR EXISTS (SELECT 1 FROM public.chat_conversas c WHERE c.id = conversa_id AND c.atendente_id = auth.uid())
  );

-- 4. contrato_financeiro_modulos / oas
DROP POLICY IF EXISTS "Authenticated users can manage contrato_financeiro_modulos" ON public.contrato_financeiro_modulos;
CREATE POLICY "contrato_financeiro_modulos_scoped" ON public.contrato_financeiro_modulos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contratos_financeiros cf WHERE cf.id = contrato_financeiro_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contratos_financeiros cf WHERE cf.id = contrato_financeiro_id));

DROP POLICY IF EXISTS "Authenticated users can manage contrato_financeiro_oas" ON public.contrato_financeiro_oas;
CREATE POLICY "contrato_financeiro_oas_scoped" ON public.contrato_financeiro_oas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contratos_financeiros cf WHERE cf.id = contrato_financeiro_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contratos_financeiros cf WHERE cf.id = contrato_financeiro_id));

-- 5. crm_historico / crm_tarefas scoped to accessible opportunities
DROP POLICY IF EXISTS "Authenticated users can read crm_historico" ON public.crm_historico;
DROP POLICY IF EXISTS "Authenticated users can insert crm_historico" ON public.crm_historico;
CREATE POLICY "crm_historico_scoped_select" ON public.crm_historico FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_oportunidades o WHERE o.id = oportunidade_id));
CREATE POLICY "crm_historico_scoped_insert" ON public.crm_historico FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.crm_oportunidades o WHERE o.id = oportunidade_id));

DROP POLICY IF EXISTS "Authenticated users can select crm_tarefas" ON public.crm_tarefas;
CREATE POLICY "crm_tarefas_scoped_select" ON public.crm_tarefas FOR SELECT TO authenticated
  USING (
    criado_por = auth.uid()
    OR EXISTS (SELECT 1 FROM public.crm_oportunidades o WHERE o.id = oportunidade_id)
  );

-- 6. fin_contas_financeiras select restricted
DROP POLICY IF EXISTS "fin_contas_financeiras_select" ON public.fin_contas_financeiras;
CREATE POLICY "fin_contas_financeiras_select" ON public.fin_contas_financeiras FOR SELECT TO authenticated
  USING (
    (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
    AND (filial_id IS NULL OR public.user_has_filial_access(filial_id))
  );

-- 7. tickets scoped select + attachment access helper
CREATE OR REPLACE FUNCTION public.can_access_ticket(_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tickets t
    LEFT JOIN public.clientes cl ON cl.id = t.cliente_id
    WHERE t.id = _ticket_id
      AND (
        t.criado_por = auth.uid()
        OR t.responsavel_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR public.has_role(auth.uid(), 'gestor'::app_role)
        OR EXISTS (SELECT 1 FROM public.ticket_seguidores s WHERE s.ticket_id = t.id AND s.user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.usuario_mesas um
          JOIN public.mesas_atendimento m ON m.id = um.mesa_id
          WHERE um.user_id = auth.uid() AND m.nome = t.mesa
        )
        OR (cl.filial_id IS NOT NULL AND public.user_has_filial_access(cl.filial_id))
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_ticket(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_access_ticket(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "auth_select_tickets" ON public.tickets;
CREATE POLICY "auth_select_tickets" ON public.tickets FOR SELECT TO authenticated
  USING (
    criado_por = auth.uid()
    OR responsavel_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR EXISTS (SELECT 1 FROM public.ticket_seguidores s WHERE s.ticket_id = tickets.id AND s.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.usuario_mesas um
      JOIN public.mesas_atendimento m ON m.id = um.mesa_id
      WHERE um.user_id = auth.uid() AND m.nome = tickets.mesa
    )
    OR EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = tickets.cliente_id AND c.filial_id IS NOT NULL AND public.user_has_filial_access(c.filial_id))
  );

-- 8. ticket attachments storage scoped
DROP POLICY IF EXISTS "auth_read_ticket_anexos" ON storage.objects;
CREATE POLICY "auth_read_ticket_anexos" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-anexos'
    AND (
      owner = auth.uid()
      OR (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        AND public.can_access_ticket(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- 9. privileged definer functions: no anonymous execution
REVOKE EXECUTE ON FUNCTION public.criar_conversa_direta(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.criar_conversa_grupo(text, uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_reprocessar_taxas_boleto(uuid, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_saldo_conta(uuid, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.fn_profiles_comissoes() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.criar_conversa_direta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_conversa_grupo(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reprocessar_taxas_boleto(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_saldo_conta(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_profiles_comissoes() TO authenticated;