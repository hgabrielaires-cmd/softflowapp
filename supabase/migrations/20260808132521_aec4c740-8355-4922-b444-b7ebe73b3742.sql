
CREATE OR REPLACE FUNCTION public.is_conversa_atendente(_conversa_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_conversa_atendentes ca WHERE ca.conversa_id = _conversa_id AND ca.user_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.is_conversa_atendente(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversa_atendente(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_conversa_owner(_conversa_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_conversas c WHERE c.id = _conversa_id AND c.atendente_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.is_conversa_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversa_owner(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS chat_conversas_scoped_select ON public.chat_conversas;
CREATE POLICY chat_conversas_scoped_select ON public.chat_conversas FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR has_role(auth.uid(),'gestor'::app_role) OR atendente_id = auth.uid()
  OR (filial_id IS NOT NULL AND user_has_filial_access(filial_id))
  OR public.is_conversa_atendente(id, auth.uid())
);

DROP POLICY IF EXISTS chat_conversas_scoped_update ON public.chat_conversas;
CREATE POLICY chat_conversas_scoped_update ON public.chat_conversas FOR UPDATE TO authenticated
USING (
  is_admin(auth.uid()) OR has_role(auth.uid(),'gestor'::app_role) OR atendente_id = auth.uid()
  OR (filial_id IS NOT NULL AND user_has_filial_access(filial_id))
  OR public.is_conversa_atendente(id, auth.uid())
)
WITH CHECK (
  is_admin(auth.uid()) OR has_role(auth.uid(),'gestor'::app_role) OR atendente_id = auth.uid()
  OR (filial_id IS NOT NULL AND user_has_filial_access(filial_id))
  OR public.is_conversa_atendente(id, auth.uid())
);

DROP POLICY IF EXISTS chat_conversa_atendentes_select ON public.chat_conversa_atendentes;
CREATE POLICY chat_conversa_atendentes_select ON public.chat_conversa_atendentes FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'gestor'::app_role)
  OR public.is_conversa_owner(conversa_id, auth.uid())
);

DROP POLICY IF EXISTS chat_conversa_atendentes_insert ON public.chat_conversa_atendentes;
CREATE POLICY chat_conversa_atendentes_insert ON public.chat_conversa_atendentes FOR INSERT TO authenticated
WITH CHECK (
  convidado_por = auth.uid() AND user_id <> auth.uid() AND (
    is_admin(auth.uid()) OR has_role(auth.uid(),'gestor'::app_role)
    OR public.is_conversa_owner(conversa_id, auth.uid())
    OR public.is_conversa_atendente(conversa_id, auth.uid())
  )
);

DROP POLICY IF EXISTS chat_conversa_atendentes_delete ON public.chat_conversa_atendentes;
CREATE POLICY chat_conversa_atendentes_delete ON public.chat_conversa_atendentes FOR DELETE TO authenticated
USING (
  user_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(),'gestor'::app_role)
  OR public.is_conversa_owner(conversa_id, auth.uid())
);

DROP POLICY IF EXISTS "Participantes visualizam chat_mensagens" ON public.chat_mensagens;
CREATE POLICY "Participantes visualizam chat_mensagens" ON public.chat_mensagens FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR has_role(auth.uid(),'gestor'::app_role)
  OR public.is_conversa_owner(conversa_id, auth.uid())
  OR public.is_conversa_atendente(conversa_id, auth.uid())
);
