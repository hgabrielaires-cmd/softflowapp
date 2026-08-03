-- 1. asaas_config: admin/financeiro only
DROP POLICY IF EXISTS "Auth users can manage asaas_config" ON public.asaas_config;
DROP POLICY IF EXISTS "Auth users can read asaas_config" ON public.asaas_config;
CREATE POLICY "Admins e financeiro gerenciam asaas_config"
ON public.asaas_config FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro'));

-- 2. r2_config: admin only
DROP POLICY IF EXISTS "Authenticated users can delete r2_config" ON public.r2_config;
DROP POLICY IF EXISTS "Authenticated users can insert r2_config" ON public.r2_config;
DROP POLICY IF EXISTS "Authenticated users can read r2_config" ON public.r2_config;
DROP POLICY IF EXISTS "Authenticated users can update r2_config" ON public.r2_config;
CREATE POLICY "Admins gerenciam r2_config"
ON public.r2_config FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3. contratos_financeiros
DROP POLICY IF EXISTS "Authenticated users can manage contratos_financeiros" ON public.contratos_financeiros;
CREATE POLICY "Financeiro gerencia contratos_financeiros"
ON public.contratos_financeiros FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gestor'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gestor'));

-- 4. contrato_financeiro_historico
DROP POLICY IF EXISTS "Authenticated users can manage contrato_financeiro_historico" ON public.contrato_financeiro_historico;
CREATE POLICY "Financeiro gerencia contrato_financeiro_historico"
ON public.contrato_financeiro_historico FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gestor'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gestor'));

-- 5. parcelas_implantacao
DROP POLICY IF EXISTS "Authenticated users can manage parcelas_implantacao" ON public.parcelas_implantacao;
CREATE POLICY "Financeiro gerencia parcelas_implantacao"
ON public.parcelas_implantacao FOR ALL TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gestor'))
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'gestor'));

-- 6. login_attempts: block all direct client access (writes only via SECURITY DEFINER rpc)
DROP POLICY IF EXISTS "No direct access to login_attempts" ON public.login_attempts;
CREATE POLICY "No direct access to login_attempts"
ON public.login_attempts FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);
REVOKE ALL ON public.login_attempts FROM anon, authenticated;
GRANT ALL ON public.login_attempts TO service_role;

-- 7. Revoke EXECUTE on SECURITY DEFINER helpers not meant to be called directly.
--    Trigger functions do not require EXECUTE privilege to fire.
REVOKE ALL ON FUNCTION public.get_cron_secret() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.audit_clientes_change() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.audit_contratos_change() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.audit_faturas_change() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.audit_user_roles_change() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.criar_card_painel_assinatura() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.enforce_single_active_template() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.increment_template_version() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean, text) FROM public;
REVOKE ALL ON FUNCTION public.check_login_blocked(text) FROM public;
REVOKE ALL ON FUNCTION public.criar_conversa_direta(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.criar_conversa_grupo(text, uuid[]) FROM anon, public;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_chat_participant(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.user_has_filial_access(uuid) FROM anon, public;
-- keep the calls the app actually needs
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_blocked(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_conversa_direta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_conversa_grupo(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_filial_access(uuid) TO authenticated;

-- 8. chat-midias: remove anonymous read, require authentication
DROP POLICY IF EXISTS "Anyone can view chat media" ON storage.objects;
CREATE POLICY "Authenticated users can view chat media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-midias');

-- 9. realtime.messages: restrict channel subscriptions to authenticated users
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated can use realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (true);
DROP POLICY IF EXISTS "Authenticated can broadcast realtime" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast realtime"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (true);