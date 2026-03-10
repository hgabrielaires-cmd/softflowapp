# Mapa do Sistema SoftFlow

Este documento descreve a organização geral do projeto SoftFlow.

Serve como referência rápida para entender a arquitetura e localização dos principais módulos.

---

## Estrutura Principal

src/

components/ → componentes globais reutilizáveis

context/ → providers globais

hooks/ → hooks reutilizáveis do sistema

integrations/ → integrações externas (Supabase, APIs)

pages/ → módulos principais do sistema

---

## Módulos Principais

Cada módulo segue o padrão definido em ARQUITETURA_SOFTFLOW.md.

Exemplos de módulos atuais:

clientes

contratos

faturamento

usuarios

pedidos

painel-atendimento

jornada-implantacao

planos

agenda

dashboard

---

## Estrutura interna de módulo

Todo módulo segue o padrão:

src/pages/<modulo>/

index.ts

types.ts

constants.ts

helpers.ts

useQueries.ts

useForm.ts

components/

---

## Fluxo arquitetural

Interface (Page)

↓

Hooks (Queries / Form)

↓

Helpers / Constants

↓

Supabase / Edge Functions

---

## Integrações principais

Supabase → banco de dados principal

Edge Functions → lógica server-side

---

## Métricas atuais do sistema

Linhas de código aproximadas: ~47.000

Arquivos: ~200

Hooks customizados: ~20

Componentes React: ~97

Edge functions: 7

---

Este documento ajuda novos desenvolvedores a entender rapidamente a arquitetura do SoftFlow.
