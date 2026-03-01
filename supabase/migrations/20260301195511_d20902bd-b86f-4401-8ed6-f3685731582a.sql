
INSERT INTO role_permissions (role, permissao, ativo) VALUES
  ('admin', 'acao.importar_clientes', true),
  ('financeiro', 'acao.importar_clientes', false),
  ('vendedor', 'acao.importar_clientes', false),
  ('operacional', 'acao.importar_clientes', false),
  ('tecnico', 'acao.importar_clientes', false)
ON CONFLICT DO NOTHING;
