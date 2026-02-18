
# Passo 2 de 10 — Cadastro de Clientes, Planos e Módulos

## Visão Geral

Este passo cria toda a base de cadastros que sustentará os próximos módulos (Pedidos e Agenda). Nenhum pedido ou agenda será construído agora — apenas o cadastro.

---

## 1. Banco de Dados (Migração SQL)

Serão criadas 4 novas tabelas:

**`clientes`**
- `id` (uuid, PK)
- `nome_fantasia` (text, obrigatório)
- `razao_social` (text, opcional)
- `cnpj_cpf` (text, obrigatório)
- `contato_nome` (text)
- `telefone` (text)
- `email` (text)
- `cidade` (text)
- `uf` (text, 2 chars)
- `filial_id` (uuid, FK → filiais)
- `ativo` (boolean, default true)
- `created_at` (timestamptz, default now())

**`modulos`**
- `id` (uuid, PK)
- `nome` (text, obrigatório)
- `ativo` (boolean, default true)
- `created_at` (timestamptz)

**`planos`**
- `id` (uuid, PK)
- `nome` (text, obrigatório)
- `descricao` (text, opcional)
- `ativo` (boolean, default true)
- `created_at` (timestamptz)

**`plano_modulos`** (tabela de vínculo)
- `id` (uuid, PK)
- `plano_id` (uuid, FK → planos)
- `modulo_id` (uuid, FK → modulos)
- `inclui_treinamento` (boolean, default false)
- `ordem` (int, default 0)
- `duracao_minutos` (int, opcional)
- `obrigatorio` (boolean, default false)

### Políticas de Segurança (RLS)

| Tabela | Admin | Financeiro | Vendedor | Técnico |
|---|---|---|---|---|
| clientes | CRUD total | CRUD total | INSERT + SELECT (somente sua filial) | SELECT (somente leitura) |
| planos | CRUD total | SELECT | SELECT | SELECT |
| modulos | CRUD total | SELECT | SELECT | SELECT |
| plano_modulos | CRUD total | SELECT | SELECT | SELECT |

---

## 2. Tipos TypeScript

Adicionar ao `src/lib/supabase-types.ts`:
- Interface `Cliente`
- Interface `Modulo`
- Interface `Plano`
- Interface `PlanoModulo`

---

## 3. Novas Telas

### `/clientes` — Gestão de Clientes
- Lista com busca por nome, telefone e CNPJ/CPF
- Botão "Novo cliente" (admin, financeiro e vendedor da própria filial)
- Dialog de criação/edição com todos os campos
- Toggle ativo/inativo inline na tabela
- Vendedor vê apenas clientes da sua filial; admin e financeiro veem todos

### `/planos` — Gestão de Planos e Módulos (somente admin)
Página com 3 abas:

**Aba "Planos"**
- Lista de planos com CRUD
- Dialog para criar/editar plano (nome, descrição, ativo)

**Aba "Módulos"**
- Lista de módulos com CRUD
- Dialog para criar/editar módulo (nome, ativo)

**Aba "Vínculos"**
- Selecionar um plano → ver/editar os módulos vinculados a ele
- Adicionar módulo ao plano com campos: inclui_treinamento, ordem, duração em minutos, obrigatório
- Remover módulo do plano

---

## 4. Navegação

Adicionar ao menu lateral (`AppLayout.tsx`) dois novos itens:
- **Clientes** — visível para todos os papéis (admin, financeiro, vendedor, técnico)
- **Planos** — visível apenas para admin

Rotas a registrar em `App.tsx`:
- `/clientes` → `<Clientes />`
- `/planos` → `<Planos />` (protegido para admin)

---

## 5. Sequência de Implementação

1. Executar migração SQL (criar tabelas + RLS)
2. Atualizar `src/lib/supabase-types.ts` com os novos tipos
3. Criar `src/pages/Clientes.tsx`
4. Criar `src/pages/Planos.tsx` (com abas: Planos / Módulos / Vínculos)
5. Atualizar `src/components/AppLayout.tsx` com os novos itens de menu
6. Atualizar `src/App.tsx` com as novas rotas
