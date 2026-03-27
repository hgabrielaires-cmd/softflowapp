
-- Drop the recursive SELECT policy on participantes
DROP POLICY IF EXISTS "Participante ve participantes" ON public.chat_interno_participantes;

-- Replace with a simple policy: authenticated users can see participantes of conversations they belong to
-- Use a non-recursive approach: user can see rows where their own user_id matches OR where they share a conversation
CREATE POLICY "Participante ve participantes" ON public.chat_interno_participantes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR conversa_id IN (
      SELECT conversa_id FROM public.chat_interno_participantes WHERE user_id = auth.uid()
    )
  );
