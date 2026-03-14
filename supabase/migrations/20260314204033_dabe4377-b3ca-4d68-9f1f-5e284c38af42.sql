
-- Add permission for editing billing values (implantação/mensalidade)
INSERT INTO public.role_permissions (role, permissao, ativo)
SELECT r.role, 'acao.editar_valores_faturamento', CASE WHEN r.role = 'admin' THEN true ELSE false END
FROM unnest(ARRAY['admin','gestor','financeiro','vendedor','operacional','tecnico']::app_role[]) AS r(role)
ON CONFLICT DO NOTHING;
