-- Add permission for editing project config after Agendamento stage
INSERT INTO public.role_permissions (role, permissao, ativo)
SELECT role, 'acao.editar_config_projeto', CASE WHEN role = 'admin' THEN true ELSE false END
FROM unnest(ARRAY['admin', 'financeiro', 'vendedor', 'operacional', 'tecnico']) AS role
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions WHERE permissao = 'acao.editar_config_projeto' AND role_permissions.role = role
);