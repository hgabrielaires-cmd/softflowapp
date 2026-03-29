INSERT INTO role_permissions (role, permissao, ativo)
VALUES
  ('admin', 'acao.vincular_contato_empresa', true),
  ('gestor', 'acao.vincular_contato_empresa', true),
  ('financeiro', 'acao.vincular_contato_empresa', true),
  ('operacional', 'acao.vincular_contato_empresa', false),
  ('vendedor', 'acao.vincular_contato_empresa', false),
  ('tecnico', 'acao.vincular_contato_empresa', false)
ON CONFLICT DO NOTHING;