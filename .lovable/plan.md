

# Jornada de Implantacao - Modulo Completo

## Resumo

Criar o modulo completo de **Jornada de Implantacao** e **Mesas de Atendimento**, incluindo banco de dados, navegacao e interfaces.

---

## 1. Banco de Dados - Novas Tabelas

### 1.1 `mesas_atendimento`
Cadastro de mesas de atendimento (ex: Suporte N1, Implantacao, Treinamento).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| nome | TEXT NOT NULL | Nome da mesa |
| descricao | TEXT | Descricao opcional |
| ativo | BOOLEAN DEFAULT true | Status |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

RLS: Admin gerencia tudo, autenticados visualizam.

### 1.2 `jornadas`
Dados principais da jornada de implantacao.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| nome | TEXT NOT NULL | Nome da jornada |
| descricao | TEXT | Descricao (preenchida do vinculo) |
| filial_id | UUID NULL | NULL = global, preenchido = filial especifica |
| vinculo_tipo | TEXT NOT NULL | 'plano', 'modulo' ou 'servico' |
| vinculo_id | UUID NOT NULL | ID do plano, modulo ou servico |
| ativo | BOOLEAN DEFAULT true | Status |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

RLS: Admin gerencia tudo, autenticados visualizam.

### 1.3 `jornada_etapas`
Etapas dentro de uma jornada.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| jornada_id | UUID FK | Referencia a jornada |
| nome | TEXT NOT NULL | Nome da etapa |
| descricao | TEXT | Descricao da etapa |
| mesa_atendimento_id | UUID FK NULL | Mesa de atendimento vinculada |
| ordem | INTEGER DEFAULT 0 | Ordem de exibicao |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

### 1.4 `jornada_atividades`
Atividades dentro de uma etapa.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| etapa_id | UUID FK | Referencia a etapa |
| nome | TEXT NOT NULL | Nome da atividade |
| descricao | TEXT | Descricao |
| horas_estimadas | NUMERIC DEFAULT 0 | Horas estimadas |
| checklist | JSONB DEFAULT '[]' | Array de itens do checklist |
| tipo_responsabilidade | TEXT DEFAULT 'Interna' | 'Interna' ou 'Externa' |
| ordem | INTEGER DEFAULT 0 | Ordem de exibicao |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

O campo `checklist` armazena um array JSON, ex: `[{"texto": "Rede", "concluido": false}, {"texto": "Equipamento Wifi", "concluido": false}]`

---

## 2. Navegacao - Alteracoes no Menu

### Menu lateral (AppLayout.tsx)

**Grupo Helpdesk** (ja existe, linhas 51-58): Adicionar dois novos itens:
- "Jornadas de Implantacao" apontando para `/jornadas`
- "Mesas de Atendimento" apontando para `/mesas-atendimento`

Remover o item antigo de "Helpdesk" em Parametros (linha 98), pois agora esta no grupo Helpdesk.

### Rotas (App.tsx)

- `/jornadas` - Pagina JornadaImplantacao
- `/mesas-atendimento` - Pagina MesasAtendimento
- Remover rota `/parametros/helpdesk`

---

## 3. Pagina: Mesas de Atendimento

Arquivo: `src/pages/MesasAtendimento.tsx`

CRUD simples com:
- Lista de mesas em tabela com filtro por nome
- Botao "Nova Mesa" abre dialog com campos: Nome e Descricao
- Toggle ativo/inativo
- Edicao e exclusao

---

## 4. Pagina: Jornadas de Implantacao

Arquivo: `src/pages/JornadaImplantacao.tsx`

### 4.1 Tela Principal - Lista
- Tabela com todas as jornadas cadastradas
- Filtros por: nome, vinculo (plano/modulo/servico), filial, status
- Colunas: Nome, Vinculo, Filial (ou "Global"), Status, Acoes
- Botao "Nova Jornada"

### 4.2 Dialog de Criacao/Edicao - Duas Abas

**Aba 1: "Dados da Jornada"**
- Filial: Select com opcao "Global (todas as filiais)" ou filial especifica
- Nome da Jornada: campo texto
- Vinculo: Select com tipo (Plano / Modulo Adicional / Servico) + Select do item
- Descricao: Textarea preenchida automaticamente ao selecionar o vinculo, editavel

**Aba 2: "Etapas e Atividades"**
- Botao "Adicionar Etapa" abre dialog secundario com:
  - Nome da Etapa
  - Descricao
  - Mesa de Atendimento (select puxando de `mesas_atendimento`)
- Lista das etapas criadas (reordenavel)
- Cada etapa mostra suas atividades e tem botao "Adicionar Atividade"
- Dialog de atividade com campos:
  - Nome da Atividade
  - Horas Estimadas
  - Descricao
  - Checklist: botao "Adicionar Item" que cria campos de texto dinamicos com checkbox
  - Tipo de Responsabilidade: Select com "Interna" ou "Externa"

---

## 5. Tipos TypeScript

Adicionar em `src/lib/supabase-types.ts`:

```text
MesaAtendimento { id, nome, descricao, ativo, created_at, updated_at }
Jornada { id, nome, descricao, filial_id, vinculo_tipo, vinculo_id, ativo, ... }
JornadaEtapa { id, jornada_id, nome, descricao, mesa_atendimento_id, ordem, ... }
JornadaAtividade { id, etapa_id, nome, descricao, horas_estimadas, checklist, tipo_responsabilidade, ordem, ... }
```

---

## Sequencia de Implementacao

1. Migration SQL (4 tabelas + RLS + triggers)
2. Tipos TypeScript
3. Pagina MesasAtendimento (CRUD simples)
4. Pagina JornadaImplantacao (lista + dialog com 2 abas)
5. Atualizacao do menu e rotas

