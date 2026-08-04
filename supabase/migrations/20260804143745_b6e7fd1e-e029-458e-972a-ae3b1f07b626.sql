-- 1) chat_mensagens: restringir SELECT a participantes / admin / gestor
DROP POLICY IF EXISTS "Authenticated users can view chat_mensagens" ON public.chat_mensagens;

CREATE POLICY "Participantes visualizam chat_mensagens"
ON public.chat_mensagens
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.chat_conversas c
    WHERE c.id = chat_mensagens.conversa_id
      AND (
        c.atendente_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.chat_conversa_atendentes a
          WHERE a.conversa_id = c.id AND a.user_id = auth.uid()
        )
      )
  )
);

-- 2) storage chat-midias: exigir vínculo com a conversa no upload
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;

CREATE POLICY "Participantes enviam midias do chat"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-midias'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.chat_conversas c
      WHERE c.id::text = split_part(name, '/', 1)
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

-- 3) realtime.messages: escopo por tópico
DROP POLICY IF EXISTS "Authenticated can broadcast realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;

CREATE POLICY "Topicos permitidos broadcast realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'presenca-broadcast'
  OR realtime.topic() = 'user:' || auth.uid()::text
);

CREATE POLICY "Topicos permitidos leitura realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'presenca-broadcast'
  OR realtime.topic() = 'user:' || auth.uid()::text
);

-- 4) Funções SECURITY DEFINER que não precisam ser chamadas diretamente pelo cliente
REVOKE EXECUTE ON FUNCTION public.fn_profiles_comissoes() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(uuid, uuid) FROM anon, PUBLIC;