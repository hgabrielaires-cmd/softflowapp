
-- Add UPDATE policy for chat_interno_conversas (participants can update)
CREATE POLICY "Participante atualiza conversa" ON public.chat_interno_conversas
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_interno_participantes p
    WHERE p.conversa_id = chat_interno_conversas.id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_interno_participantes p
    WHERE p.conversa_id = chat_interno_conversas.id AND p.user_id = auth.uid()
  ));
