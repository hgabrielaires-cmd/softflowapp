# Criação de Módulos no SoftFlow

Este guia define o padrão obrigatório para criação de novos módulos no sistema.

Todo módulo deve seguir a arquitetura definida em ARQUITETURA_SOFTFLOW.md.

---

## Estrutura obrigatória

src/pages/<modulo>/

├── index.ts

├── types.ts

├── constants.ts

├── helpers.ts

├── use<Modulo>Queries.ts

├── use<Modulo>Form.ts

└── components/

---

## Etapas para criar um módulo

1. Criar pasta do módulo em:

src/pages/<modulo>/

2. Criar os arquivos base:

types.ts

constants.ts

helpers.ts

use<Modulo>Queries.ts

use<Modulo>Form.ts

index.ts

3. Criar pasta components/

components/

4. Criar a página principal:

src/pages/<Modulo>.tsx

---

## Responsabilidade da página

A página deve conter apenas:

• layout

• filtros

• tabela

• paginação

• wiring de dialogs

• consumo dos hooks

A página não deve conter:

• queries

• mutations

• regras de negócio

• JSX de dialogs grandes

---

## Regras de tamanho

Página ideal: até 300 linhas  

Página máxima: 500 linhas  

Se ultrapassar 600 linhas → refatorar.

---

## Nome de hooks

use<Modulo>Queries

use<Modulo>Form

use<Modulo>Actions

---

## Checklist de entrega

Todo módulo deve informar:

Arquivos criados

Arquivos alterados

Linhas antes/depois

Build status

Módulo estabilizado

---

Este guia garante que todos os módulos do SoftFlow mantenham consistência arquitetural.
