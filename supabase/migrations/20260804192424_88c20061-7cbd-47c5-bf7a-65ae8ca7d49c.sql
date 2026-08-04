
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  AND (
    auth.uid() IS NULL
    OR _user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permissao text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role::text = ur.role::text
    WHERE ur.user_id = _user_id
      AND rp.permissao = _permissao
      AND rp.ativo = true
  )
  AND (
    auth.uid() IS NULL
    OR _user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _conversa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_interno_participantes
    WHERE user_id = _user_id AND conversa_id = _conversa_id
  )
  AND (auth.uid() IS NULL OR _user_id = auth.uid())
$$;

REVOKE EXECUTE ON FUNCTION public.fn_recriar_crons_contaazul(text[], text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_listar_crons_contaazul() FROM authenticated;
