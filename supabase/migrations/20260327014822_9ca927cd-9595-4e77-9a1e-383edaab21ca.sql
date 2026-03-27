
-- Drop broken policies
DROP POLICY IF EXISTS "Participante ve conversa" ON public.chat_interno_conversas;
DROP POLICY IF EXISTS "Participante ve mensagens" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "Participante envia mensagem" ON public.chat_interno_mensagens;
DROP POLICY IF EXISTS "Participante ve participantes" ON public.chat_interno_participantes;

-- Fix: SELECT on conversas
CREATE POLICY "Participante ve conversa" ON public.chat_interno_conversas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_interno_participantes p
    WHERE p.conversa_id = chat_interno_conversas.id AND p.user_id = auth.uid()
  ));

-- Fix: SELECT on mensagens
CREATE POLICY "Participante ve mensagens" ON public.chat_interno_mensagens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_interno_participantes p
    WHERE p.conversa_id = chat_interno_mensagens.conversa_id AND p.user_id = auth.uid()
  ));

-- Fix: INSERT on mensagens
CREATE POLICY "Participante envia mensagem" ON public.chat_interno_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM chat_interno_participantes p
      WHERE p.conversa_id = chat_interno_mensagens.conversa_id AND p.user_id = auth.uid()
    )
  );

-- Fix: SELECT on participantes
CREATE POLICY "Participante ve participantes" ON public.chat_interno_participantes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_interno_participantes p2
    WHERE p2.conversa_id = chat_interno_participantes.conversa_id AND p2.user_id = auth.uid()
  ));
