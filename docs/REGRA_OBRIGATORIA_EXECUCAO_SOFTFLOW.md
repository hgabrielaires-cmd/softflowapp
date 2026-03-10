# Regra Obrigatória de Execução do SoftFlow

Este documento define como qualquer tarefa deve ser executada dentro do projeto SoftFlow.

A leitura e respeito a este arquivo são obrigatórios antes de qualquer criação, alteração ou refatoração.

---

## Regra principal

Antes de implementar qualquer funcionalidade, o sistema deve sempre respeitar esta ordem:

1. Definir a arquitetura do módulo

2. Criar a estrutura base do módulo

3. Separar tipos, constantes, helpers e hooks

4. Só depois criar ou alterar a página principal

5. Só depois criar dialogs e componentes grandes

6. Só depois conectar regras de negócio e persistência

7. Validar build e organização final

---

## Proibições

É proibido:

• criar página monolítica

• colocar regra de negócio direto no JSX

• misturar query com layout

• criar dialogs grandes dentro da página

• usar cores fixas no lugar de tokens

• usar "as any" para acelerar implementação

• ultrapassar os limites de tamanho definidos no ARQUITETURA_SOFTFLOW.md

---

## Regra de decisão antes de codar

Antes de escrever código, sempre responder mentalmente:

1. Esse módulo já tem pasta própria?

2. Já existem types, constants, helpers e hooks?

3. O que vai ficar na página e o que vai sair dela?

4. Algum dialog precisa nascer separado?

5. Isso vai deixar a página acima de 500 linhas?

Se qualquer resposta indicar risco estrutural, a implementação deve ser reorganizada antes de continuar.

---

## Regra de saída

Nenhuma tarefa deve ser considerada concluída sem informar:

Arquivos criados

Arquivos alterados

Linhas antes/depois

Build status

Módulo estabilizado

---

## Objetivo

Garantir que o SoftFlow cresça com arquitetura consistente, previsível, legível e sustentável.

Este documento complementa:

- ARQUITETURA_SOFTFLOW.md

- CRIAR_MODULO_SOFTFLOW.md

- MAPA_DO_SISTEMA_SOFTFLOW.md
