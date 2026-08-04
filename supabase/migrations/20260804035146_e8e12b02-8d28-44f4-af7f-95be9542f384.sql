-- 1. profiles_comissoes: view SECURITY INVOKER sobre função protegida
CREATE OR REPLACE FUNCTION public.fn_profiles_comissoes()
RETURNS TABLE (
  user_id uuid,
  comissao_percentual numeric,
  comissao_implantacao_percentual numeric,
  comissao_mensalidade_percentual numeric,
  comissao_servico_percentual numeric,
  desconto_limite_implantacao numeric,
  desconto_limite_mensalidade numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
         p.comissao_percentual,
         p.comissao_implantacao_percentual,
         p.comissao_mensalidade_percentual,
         p.comissao_servico_percentual,
         p.desconto_limite_implantacao,
         p.desconto_limite_mensalidade
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (
      p.user_id = auth.uid()
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'gestor'::app_role)
    );
$$;

REVOKE ALL ON FUNCTION public.fn_profiles_comissoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_profiles_comissoes() TO authenticated, service_role;

DROP VIEW IF EXISTS public.profiles_comissoes;
CREATE VIEW public.profiles_comissoes
WITH (security_invoker = on) AS
SELECT * FROM public.fn_profiles_comissoes();

REVOKE ALL ON public.profiles_comissoes FROM anon;
GRANT SELECT ON public.profiles_comissoes TO authenticated;

-- 2. Buckets públicos: remover políticas amplas de listagem
DROP POLICY IF EXISTS "Avatares visiveis para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Logos visiveis para autenticados" ON storage.objects;

-- 3. chat-midias: exigir participação na conversa
DROP POLICY IF EXISTS "Authenticated users can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own chat media" ON storage.objects;

CREATE POLICY "Participantes visualizam midias do chat"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-midias'
  AND (
    owner = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_conversas c
      WHERE c.id::text = split_part(objects.name, '/', 1)
        AND (
          c.atendente_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.chat_conversa_atendentes a
            WHERE a.conversa_id = c.id AND a.user_id = auth.uid()
          )
        )
    )
  )
);

CREATE POLICY "Remetente ou admin exclui midias do chat"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-midias'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
);

-- 4. crm_tarefas_historico
DROP POLICY IF EXISTS "Authenticated users can manage task history" ON public.crm_tarefas_historico;

CREATE POLICY "Autenticados leem historico de tarefas"
ON public.crm_tarefas_historico FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuario registra historico proprio"
ON public.crm_tarefas_historico FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin altera historico de tarefas"
ON public.crm_tarefas_historico FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admin exclui historico de tarefas"
ON public.crm_tarefas_historico FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. helpdesk_modelos_ticket: escrita restrita
DROP POLICY IF EXISTS "auth_insert_helpdesk_modelos" ON public.helpdesk_modelos_ticket;
DROP POLICY IF EXISTS "auth_update_helpdesk_modelos" ON public.helpdesk_modelos_ticket;
DROP POLICY IF EXISTS "auth_delete_helpdesk_modelos" ON public.helpdesk_modelos_ticket;

CREATE POLICY "Admin gestor inserem modelos de ticket"
ON public.helpdesk_modelos_ticket FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin gestor atualizam modelos de ticket"
ON public.helpdesk_modelos_ticket FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin gestor excluem modelos de ticket"
ON public.helpdesk_modelos_ticket FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gestor'::app_role));

-- 6. helpdesk_tags: escrita restrita
DROP POLICY IF EXISTS "Authenticated can insert tags" ON public.helpdesk_tags;
DROP POLICY IF EXISTS "Authenticated can update tags" ON public.helpdesk_tags;
DROP POLICY IF EXISTS "Authenticated can delete tags" ON public.helpdesk_tags;

CREATE POLICY "Admin gestor inserem tags"
ON public.helpdesk_tags FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin gestor atualizam tags"
ON public.helpdesk_tags FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Admin gestor excluem tags"
ON public.helpdesk_tags FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'gestor'::app_role));

-- 7. ticket_comentarios: impedir falsificação de autor
DROP POLICY IF EXISTS "auth_insert_ticket_comentarios" ON public.ticket_comentarios;

CREATE POLICY "Usuario comenta em nome proprio"
ON public.ticket_comentarios FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 8. tickets: restringir update
DROP POLICY IF EXISTS "auth_update_tickets" ON public.tickets;

CREATE POLICY "Responsavel autor ou gestao atualiza tickets"
ON public.tickets FOR UPDATE TO authenticated
USING (
  responsavel_id IS NULL
  OR responsavel_id = auth.uid()
  OR criado_por = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'gestor'::app_role)
)
WITH CHECK (
  responsavel_id IS NULL
  OR responsavel_id = auth.uid()
  OR criado_por = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'gestor'::app_role)
);

-- 9. Funções SECURITY DEFINER: checagem interna de autorização
CREATE OR REPLACE FUNCTION public.fn_saldo_conta(p_conta_id uuid, p_data date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_saldo_inicial numeric;
  v_entradas numeric;
  v_saidas numeric;
  v_filial uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT COALESCE(saldo_inicial, 0), filial_id INTO v_saldo_inicial, v_filial
  FROM public.fin_contas_financeiras WHERE id = p_conta_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_filial IS NOT NULL AND NOT public.user_has_filial_access(v_filial) THEN
    RAISE EXCEPTION 'Sem acesso a esta conta financeira';
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.criar_conversa_direta(p_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conversa_id uuid;
  v_existing_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_target_user_id IS NULL OR p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Destinatário inválido';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id AND active = true) THEN
    RAISE EXCEPTION 'Destinatário inválido';
  END IF;

  SELECT p1.conversa_id INTO v_existing_id
  FROM chat_interno_participantes p1
  JOIN chat_interno_participantes p2 ON p1.conversa_id = p2.conversa_id
  JOIN chat_interno_conversas c ON c.id = p1.conversa_id
  WHERE p1.user_id = auth.uid()
    AND p2.user_id = p_target_user_id
    AND c.tipo = 'direto';

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  INSERT INTO chat_interno_conversas (tipo) VALUES ('direto') RETURNING id INTO v_conversa_id;

  INSERT INTO chat_interno_participantes (conversa_id, user_id) VALUES
    (v_conversa_id, auth.uid()),
    (v_conversa_id, p_target_user_id);

  RETURN v_conversa_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.criar_conversa_grupo(p_nome text, p_participantes uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conversa_id uuid;
  v_uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_nome IS NULL OR length(trim(p_nome)) = 0 OR length(p_nome) > 120 THEN
    RAISE EXCEPTION 'Nome do grupo inválido';
  END IF;
  IF p_participantes IS NULL OR array_length(p_participantes, 1) IS NULL OR array_length(p_participantes, 1) > 100 THEN
    RAISE EXCEPTION 'Lista de participantes inválida';
  END IF;

  INSERT INTO chat_interno_conversas (tipo, nome) VALUES ('grupo', p_nome) RETURNING id INTO v_conversa_id;

  INSERT INTO chat_interno_participantes (conversa_id, user_id) VALUES (v_conversa_id, auth.uid());

  FOREACH v_uid IN ARRAY p_participantes LOOP
    IF v_uid <> auth.uid()
       AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_uid AND active = true) THEN
      INSERT INTO chat_interno_participantes (conversa_id, user_id) VALUES (v_conversa_id, v_uid);
    END IF;
  END LOOP;

  RETURN v_conversa_id;
END;
$function$;

-- 10. Rotinas de login deixam de ser expostas na API (usadas pela edge function login-guard)
REVOKE ALL ON FUNCTION public.check_login_blocked(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_blocked(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO service_role;