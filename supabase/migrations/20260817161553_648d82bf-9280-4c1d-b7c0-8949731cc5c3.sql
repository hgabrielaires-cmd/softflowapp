-- audit_logs: remover INSERT aberto; gravação apenas via triggers SECURITY DEFINER / service_role
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- chat_mensagens: só participantes da conversa podem inserir
DROP POLICY IF EXISTS "Authenticated users can insert chat_mensagens" ON public.chat_mensagens;
CREATE POLICY "Participantes inserem chat_mensagens"
ON public.chat_mensagens
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR is_conversa_owner(conversa_id, auth.uid())
  OR is_conversa_atendente(conversa_id, auth.uid())
);
GRANT ALL ON public.chat_mensagens TO service_role;