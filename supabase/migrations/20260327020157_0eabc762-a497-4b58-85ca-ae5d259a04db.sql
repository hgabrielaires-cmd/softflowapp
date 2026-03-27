
-- Create a security definer function to check participation without recursion
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _conversa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_interno_participantes
    WHERE user_id = _user_id AND conversa_id = _conversa_id
  )
$$;

-- Fix participantes SELECT policy using the function
DROP POLICY IF EXISTS "Participante ve participantes" ON public.chat_interno_participantes;
CREATE POLICY "Participante ve participantes" ON public.chat_interno_participantes
  FOR SELECT TO authenticated
  USING (public.is_chat_participant(auth.uid(), conversa_id));

-- Fix conversas SELECT policy using the function
DROP POLICY IF EXISTS "Participante ve conversa" ON public.chat_interno_conversas;
CREATE POLICY "Participante ve conversa" ON public.chat_interno_conversas
  FOR SELECT TO authenticated
  USING (public.is_chat_participant(auth.uid(), id));

-- Fix conversas UPDATE policy using the function
DROP POLICY IF EXISTS "Participante atualiza conversa" ON public.chat_interno_conversas;
CREATE POLICY "Participante atualiza conversa" ON public.chat_interno_conversas
  FOR UPDATE TO authenticated
  USING (public.is_chat_participant(auth.uid(), id))
  WITH CHECK (public.is_chat_participant(auth.uid(), id));

-- Fix mensagens SELECT policy using the function
DROP POLICY IF EXISTS "Participante ve mensagens" ON public.chat_interno_mensagens;
CREATE POLICY "Participante ve mensagens" ON public.chat_interno_mensagens
  FOR SELECT TO authenticated
  USING (public.is_chat_participant(auth.uid(), conversa_id));

-- Fix mensagens INSERT policy using the function
DROP POLICY IF EXISTS "Participante envia mensagem" ON public.chat_interno_mensagens;
CREATE POLICY "Participante envia mensagem" ON public.chat_interno_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_chat_participant(auth.uid(), conversa_id));
