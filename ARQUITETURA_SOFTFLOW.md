# Arquitetura SoftFlow — Padrão Oficial

> Este documento é a referência obrigatória para toda criação ou refatoração de módulos no SoftFlow.

---

## 1. Estrutura de Diretório por Módulo

```
src/pages/<modulo>/
├── index.ts              # Barrel exports
├── types.ts              # Interfaces e tipos do domínio
├── constants.ts          # Constantes, enums, opções de select
├── helpers.ts            # Funções puras (formatação, cálculo, validação)
├── use<Modulo>Queries.ts # Hook(s) de leitura (useQuery)
├── use<Modulo>Form.ts    # Hook de mutações, estados de formulário, lógica de save
└── components/
    ├── <Dialog>Dialog.tsx # Cada diálogo grande em arquivo próprio
    └── <Widget>.tsx       # Componentes visuais reutilizáveis do módulo
```

---

## 2. Responsabilidades

| Camada | O que vai aqui | O que NÃO vai aqui |
|---|---|---|
| **Página principal** (`<Modulo>.tsx`) | Layout, filtros, tabela, paginação, wiring de dialogs | Queries, mutations, regras de negócio, JSX de dialogs |
| **types.ts** | Interfaces de domínio, form states, props de componentes | Lógica, imports de Supabase |
| **constants.ts** | Arrays de opções, ITEMS_PER_PAGE, mapas de labels | Lógica computada |
| **helpers.ts** | Funções puras: formatação, cálculo, validação, badges | Chamadas ao banco, side effects |
| **useXxxQueries.ts** | `useQuery` para leitura, derivações com `useMemo` | Mutations, estados de UI |
| **useXxxForm.ts** | `useMutation`, estados de formulário, handlers de save | Renderização, JSX |
| **components/*.tsx** | Dialogs, cards, widgets visuais isolados | Queries diretas, regras de negócio |

---

## 3. Regras Invioláveis

1. **Página principal ≤ 500 linhas** — se passar, extrair.
2. **Nenhum `useQuery`/`useMutation` no JSX** da página — sempre em hooks.
3. **Nenhum `as any`** em operações de banco — tipar corretamente.
4. **Dialogs > 100 linhas** viram componente em `components/`.
5. **Regras de negócio sensíveis** (preço, permissão, validação) ficam em helpers ou hooks, nunca inline no JSX.
6. **Barrel exports** (`index.ts`) obrigatório para cada módulo.
7. **Design tokens** — usar variáveis semânticas do Tailwind (`bg-primary`, `text-muted-foreground`), nunca cores diretas.
8. **Imports do Supabase** — sempre via `@/integrations/supabase/client`. Nunca editar `client.ts` ou `types.ts`.

---

## 4. Checklist de Entrega

Ao concluir qualquer módulo, informar:

- [ ] Arquivos criados e alterados
- [ ] Linhas antes → depois (arquivo principal)
- [ ] Build limpo (`npm run build`)
- [ ] Typecheck limpo
- [ ] Módulo estabilizado (sim/não)

---

## 5. Módulos Já Estabilizados

| Módulo | Antes | Depois | Redução |
|---|---|---|---|
| PainelAtendimento | ~4.800 | ~1.200 | 75% |
| Pedidos | ~2.100 | ~490 | 77% |
| Contratos | ~3.386 | ~846 | 75% |
| Clientes | ~1.582 | ~290 | 82% |
| JornadaImplantacao | ~1.257 | ~203 | 84% |
| Usuarios | ~1.246 | ~228 | 82% |
| Faturamento | ~1.054 | ~490 | 53% |

---

## 6. Próximos Candidatos (por complexidade)

1. **Planos.tsx** (~903 linhas)
2. **Dashboard.tsx**
3. **Agenda.tsx**

---

*Última atualização: 2026-03-10*
