CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permissao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role::text = ur.role::text
    WHERE ur.user_id = _user_id
      AND rp.permissao = _permissao
      AND rp.ativo = true
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;

GRANT SELECT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "Despesas audit readable with permission" ON public.audit_logs;
CREATE POLICY "Despesas audit readable with permission"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  entity_type = 'fin_despesas'
  AND public.has_permission(auth.uid(), 'menu.despesas_auditoria')
);