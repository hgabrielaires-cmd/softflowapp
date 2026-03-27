
CREATE OR REPLACE FUNCTION public.criar_conversa_direta(p_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversa_id uuid;
  v_existing_id uuid;
BEGIN
  -- Check if DM already exists between these two users
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

  -- Create new conversation
  INSERT INTO chat_interno_conversas (tipo) VALUES ('direto') RETURNING id INTO v_conversa_id;

  -- Add both participants
  INSERT INTO chat_interno_participantes (conversa_id, user_id) VALUES
    (v_conversa_id, auth.uid()),
    (v_conversa_id, p_target_user_id);

  RETURN v_conversa_id;
END;
$$;

-- Also create function for group creation
CREATE OR REPLACE FUNCTION public.criar_conversa_grupo(p_nome text, p_participantes uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conversa_id uuid;
  v_uid uuid;
BEGIN
  INSERT INTO chat_interno_conversas (tipo, nome) VALUES ('grupo', p_nome) RETURNING id INTO v_conversa_id;

  -- Add creator
  INSERT INTO chat_interno_participantes (conversa_id, user_id) VALUES (v_conversa_id, auth.uid());

  -- Add other participants
  FOREACH v_uid IN ARRAY p_participantes LOOP
    IF v_uid != auth.uid() THEN
      INSERT INTO chat_interno_participantes (conversa_id, user_id) VALUES (v_conversa_id, v_uid);
    END IF;
  END LOOP;

  RETURN v_conversa_id;
END;
$$;
