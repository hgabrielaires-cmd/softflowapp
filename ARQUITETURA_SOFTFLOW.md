Este documento é a referência obrigatória para toda criação ou refatoração de módulos no SoftFlow.

---

## 1. Estrutura de Diretório por Módulo

src/pages/<modulo>/
├── index.ts
├── types.ts
├── constants.ts
├── helpers.ts
├── use<Modulo>Queries.ts
├── use<Modulo>Form.ts
└── components/
    ├── Dialog.tsx
    └── Component.tsx

---

## 2. Responsabilidades

Página principal (.tsx)
Layout, filtros, tabela, paginação, wiring de dialogs.

Não deve conter:
queries, mutations, regras de negócio ou JSX de dialogs.

types.ts
Interfaces e tipos de domínio.

constants.ts
Constantes e enums.

helpers.ts
Funções puras.

useQueries
Hooks de leitura (useQuery).

useForm
Hooks de mutação e controle de formulário.

components
Componentes visuais e dialogs.

---

## 3. Regras Invioláveis

1. Página principal ≤ 500 linhas.
2. Nenhum useQuery ou useMutation no JSX da página.
3. Nenhum "as any" em queries de banco.
4. Dialogs > 100 linhas devem virar componente.
5. Regras de negócio nunca ficam no JSX.
6. Barrel export obrigatório (index.ts).
7. Usar tokens do Tailwind, nunca cores fixas.
8. Supabase sempre via "@/integrations/supabase/client".

---

## 4. Regra de Crescimento de Arquivo

Se um arquivo ultrapassar:

600 linhas → refatorar
800 linhas → dividir obrigatoriamente

Nenhuma página deve ultrapassar 1000 linhas.

---

## 5. Padrão de Hooks

use<Modulo>Queries
use<Modulo>Form
use<Modulo>Actions

---

## 6. Checklist de Entrega

Sempre informar:

• arquivos criados
• arquivos alterados
• linhas antes/depois
• build status
• módulo estabilizado

---

Este documento define o padrão oficial de arquitetura do SoftFlow.
