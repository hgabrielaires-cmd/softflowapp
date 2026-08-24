// ─── Permissões implícitas da marcação "É Vendedor?" do cadastro de usuário ───
// Um usuário marcado como vendedor (profiles.is_vendedor) ganha acesso a Vendas
// (Pedidos) e ao cadastro de Clientes, independente do seu perfil de acesso.
// A visibilidade dos dados continua controlada pelas políticas do banco:
// ele só enxerga os pedidos em que é o vendedor.

export const VENDEDOR_MENU_PERMS = [
  "menu.pedidos",
  "menu.clientes",
] as const;

export const VENDEDOR_CRUD_PERMS = [
  "crud.pedidos.incluir",
  "crud.pedidos.editar",
  "crud.clientes.incluir",
  "crud.clientes.editar",
] as const;
