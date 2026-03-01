
-- Add new permission for managing apontamentos to all roles
INSERT INTO public.role_permissions (role, permissao, ativo)
SELECT r.role, 'acao.gerenciar_apontamento', CASE WHEN r.role = 'admin' THEN true ELSE false END
FROM (VALUES ('admin'), ('financeiro'), ('vendedor'), ('operacional'), ('tecnico')) AS r(role)
ON CONFLICT DO NOTHING;
