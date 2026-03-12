
-- Insert CRM permissions for all roles
-- menu.crm (parent), menu.crm_pipeline, menu.crm_agenda, menu.crm_parametros
-- crud: crm_oportunidades (incluir, editar, excluir)
-- acao: acao.ganhar_oportunidade, acao.perder_oportunidade

INSERT INTO role_permissions (role, permissao, ativo)
SELECT r.role, p.permissao, 
  CASE WHEN r.role = 'admin' THEN true ELSE false END as ativo
FROM 
  (VALUES ('admin'), ('gestor'), ('financeiro'), ('vendedor'), ('operacional'), ('tecnico')) AS r(role),
  (VALUES 
    ('menu.crm'),
    ('menu.crm_pipeline'),
    ('menu.crm_agenda'),
    ('menu.crm_parametros'),
    ('crud.crm_oportunidades.incluir'),
    ('crud.crm_oportunidades.editar'),
    ('crud.crm_oportunidades.excluir')
  ) AS p(permissao)
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role = r.role AND rp.permissao = p.permissao
);
