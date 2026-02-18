
# Passo 3 de 10 — Módulo de Pedidos de Venda

## Visão Geral

Cria o módulo completo de registro de pedidos com cálculo automático de comissão. Nenhuma aprovação financeira, geração de contrato, agenda ou comissão paga será construída nesta etapa.

---

## 1. Banco de Dados (Migração SQL)

### Nova tabela: `pedidos`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid PK | gen_random_uuid() |
| `cliente_id` | uuid FK → clientes | obrigatório |
| `vendedor_id` | uuid FK → auth.users (via profiles.user_id) | obrigatório |
| `filial_id` | uuid FK → filiais | obrigatório |
| `plano_id` | uuid FK → planos | obrigatório |
| `valor_implantacao` | numeric(10,2) | default 0 |
| `valor_mensalidade` | numeric(10,2) | default 0 |
| `valor_total` | numeric(10,2) | calculado: implantação + mensalidade |
| `comissao_percentual` | numeric(5,2) | preenchido com padrão do vendedor, editável |
| `comissao_valor` | numeric(10,2) | calculado: valor_total × comissao_percentual / 100; 0 se cancelado |
| `status_pedido` | text | 'Aguardando Financeiro', 'Cancelado' |
| `observacoes` | text | opcional |
| `created_at` | timestamptz | now() |
| `updated_at` | timestamptz | now(), atualizado via trigger |

### Nova coluna na tabela `profiles`

Adicionar `comissao_percentual numeric(5,2) default 5` — percentual padrão do vendedor, configurável pelo admin na tela de Usuários.

### RLS Policies para `pedidos`

| Role | Permissão |
|---|---|
| `admin` | SELECT, INSERT, UPDATE, DELETE em todos |
| `financeiro` | SELECT em todos |
| `vendedor` | SELECT e INSERT apenas na sua filial (`filial_id = profile.filial_id`) |
| `tecnico` | Sem acesso |

### Trigger `updated_at`

Reutilizar a função `update_updated_at_column()` já existente no banco.

---

## 2. Tipos TypeScript

Adicionar ao `src/lib/supabase-types.ts`:

```typescript
export interface Pedido {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  filial_id: string;
  plano_id: string;
  valor_implantacao: number;
  valor_mensalidade: number;
  valor_total: number;
  comissao_percentual: number;
  comissao_valor: number;
  status_pedido: 'Aguardando Financeiro' | 'Cancelado';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  cliente?: Cliente;
  plano?: Plano;
  vendedor?: Profile;
  filial?: Filial;
}
```

Também atualizar `Profile` para incluir `comissao_percentual: number | null`.

---

## 3. Tela de Pedidos — `src/pages/Pedidos.tsx`

### Listagem (página principal)

- Tabela com colunas: Cliente, Plano, Filial, Vendedor, Valor Total, Comissão, Status, Data, Ações
- Barra de filtros:
  - Busca por nome do cliente
  - Filtro por filial (admin/financeiro)
  - Filtro por status (Aguardando Financeiro / Cancelado)
  - Filtro por período (data inicial e final)
- Botão **"Novo Pedido"** — visível somente para `vendedor` e `admin`
- Botão **Editar** em cada linha (lápis) — visível para `admin` e para o `vendedor` dono do pedido
- Botão **Cancelar pedido** — somente admin

### Comportamento por Role

| Role | Ver | Criar | Editar | Cancelar |
|---|---|---|---|---|
| admin | Todos | Sim | Sim | Sim |
| financeiro | Todos | Não | Não | Não |
| vendedor | Só da sua filial | Sim | Só os seus | Não |
| tecnico | Nenhum | Não | Não | Não |

### Dialog — Criar/Editar Pedido

Campos do formulário:
1. **Cliente** — Select buscando clientes da filial (para vendedor) ou todos (admin)
2. **Plano** — Select com planos ativos
3. **Valor de Implantação** — Input numérico (R$)
4. **Valor de Mensalidade** — Input numérico (R$)
5. **Valor Total** — Calculado automaticamente (implantação + mensalidade), exibido como somente leitura
6. **Comissão (%)** — Pré-preenchido com `comissao_percentual` do vendedor logado, editável manualmente
7. **Comissão (R$)** — Calculado automaticamente (valor_total × percentual / 100), somente leitura
8. **Observações** — Textarea opcional

Ao criar:
- `status_pedido` é sempre definido como `'Aguardando Financeiro'` (sem campo visível para o usuário)
- `vendedor_id` = usuário logado (se vendedor) ou selecionável pelo admin
- `filial_id` = filial do vendedor logado (se vendedor) ou selecionável pelo admin

---

## 4. Atualização da Tela de Usuários — `src/pages/Usuarios.tsx`

Adicionar campo **"Comissão padrão (%)"** no formulário de convite/edição do usuário. Este valor é salvo em `profiles.comissao_percentual` e pré-preenchido automaticamente ao criar um pedido.

---

## 5. Atualização da Navegação

- `src/components/AppLayout.tsx`: O item "Pedidos" já está no menu. Ajustar a restrição de roles para excluir `tecnico` (apenas `admin`, `financeiro` e `vendedor` enxergam o menu)
- `src/App.tsx`: Substituir o `<ComingSoon>` da rota `/pedidos` pelo componente `<Pedidos />`

---

## 6. Sequência de Implementação

1. Executar migração SQL (tabela `pedidos` + coluna `comissao_percentual` em `profiles` + trigger `updated_at` + RLS)
2. Atualizar `src/lib/supabase-types.ts` com interface `Pedido` e campo em `Profile`
3. Criar `src/pages/Pedidos.tsx` com lista + filtros + dialog criar/editar
4. Atualizar `src/pages/Usuarios.tsx` com o campo de comissão padrão
5. Atualizar `src/components/AppLayout.tsx` para restringir "Pedidos" ao técnico
6. Atualizar `src/App.tsx` para registrar a rota real de Pedidos
