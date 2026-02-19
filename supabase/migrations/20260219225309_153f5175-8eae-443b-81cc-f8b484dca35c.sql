
-- Tabela para armazenar permissões configuráveis por role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permissao text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permissao)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Admin gerencia
CREATE POLICY "Admin gerencia role_permissions"
  ON public.role_permissions FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Autenticados visualizam
CREATE POLICY "Autenticados visualizam role_permissions"
  ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir permissões padrão para cada role
-- Permissões disponíveis no sistema
DO $$
DECLARE
  roles text[] := ARRAY['admin', 'financeiro', 'vendedor', 'operacional', 'tecnico'];
  perms text[] := ARRAY[
    'menu.dashboard',
    'menu.clientes',
    'menu.pedidos',
    'menu.contratos',
    'menu.modelos_contrato',
    'menu.planos',
    'menu.modulos',
    'menu.financeiro',
    'menu.usuarios',
    'menu.filiais',
    'menu.notificacoes',
    'menu.perfil',
    'acao.aprovar_pedido',
    'acao.gerar_contrato',
    'acao.gerenciar_desconto'
  ];
  r text;
  p text;
  is_active boolean;
BEGIN
  FOREACH r IN ARRAY roles LOOP
    FOREACH p IN ARRAY perms LOOP
      -- Admin tem tudo ativo
      IF r = 'admin' THEN
        is_active := true;
      -- Financeiro
      ELSIF r = 'financeiro' THEN
        is_active := p IN ('menu.dashboard', 'menu.clientes', 'menu.pedidos', 'menu.contratos', 'menu.financeiro', 'menu.notificacoes', 'menu.perfil', 'acao.aprovar_pedido');
      -- Vendedor
      ELSIF r = 'vendedor' THEN
        is_active := p IN ('menu.dashboard', 'menu.clientes', 'menu.pedidos', 'menu.notificacoes', 'menu.perfil');
      -- Operacional
      ELSIF r = 'operacional' THEN
        is_active := p IN ('menu.dashboard', 'menu.clientes', 'menu.pedidos', 'menu.contratos', 'menu.notificacoes', 'menu.perfil');
      -- Tecnico
      ELSIF r = 'tecnico' THEN
        is_active := p IN ('menu.dashboard', 'menu.clientes', 'menu.contratos', 'menu.notificacoes', 'menu.perfil');
      ELSE
        is_active := false;
      END IF;

      INSERT INTO public.role_permissions (role, permissao, ativo)
      VALUES (r, p, is_active);
    END LOOP;
  END LOOP;
END $$;
