

# Modelos de Contrato - Sistema por Clausulas

## Problema Atual
Hoje o modelo de contrato e um unico bloco de HTML bruto digitado em um textarea. Isso causa:
- Dificuldade de manutencao (editar uma clausula exige encontrar no meio do HTML)
- Problemas de layout no PDF (o HTML livre quebra de formas imprevisiveis)
- Risco de erro ao copiar/colar HTML malformado

## Nova Abordagem: Clausulas Modulares

O contrato sera composto por **clausulas individuais** que o admin pode criar, reordenar e personalizar. Cada clausula tem seu proprio titulo e conteudo com suporte a variaveis dinamicas.

### Como vai funcionar

1. **Biblioteca de Clausulas**: Um cadastro global de clausulas reutilizaveis (ex: "Objeto do Contrato", "Valores e Pagamento", "Prazo e Vigencia", "Foro")
2. **Montagem do Modelo**: O admin seleciona quais clausulas compoe cada modelo de contrato e define a ordem
3. **Personalizacao**: Cada clausula pode ter seu texto editado dentro do modelo, com variaveis {{...}} disponiveis
4. **Preview**: O sistema monta o documento final combinando todas as clausulas na ordem definida
5. **Geracao PDF**: O backend monta o HTML final a partir das clausulas e gera o PDF

### Fluxo do Usuario

```text
+---------------------------+
| Modelos de Contrato       |
+---------------------------+
        |
        v
+---------------------------+
| Editar Modelo             |
| [Nome] [Tipo] [Filial]   |
+---------------------------+
| Clausulas do Modelo:      |
|                           |
| 1. Cabecalho        [^v] |
| 2. Objeto            [^v] |
| 3. Valores           [^v] |
| 4. Pagamento         [^v] |
| 5. Prazo             [^v] |
| 6. Foro              [^v] |
|                           |
| [+ Adicionar Clausula]    |
+---------------------------+
| Ao clicar numa clausula:  |
| Editor de texto rico com  |
| painel de variaveis       |
+---------------------------+
```

## Detalhes Tecnicos

### 1. Nova tabela: `contract_clauses` (Biblioteca de clausulas)

```sql
CREATE TABLE contract_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo_html TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'CONTRATO_BASE',
  ordem_padrao INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Clausulas reutilizaveis que servem como "base" para montar modelos.

### 2. Nova tabela: `template_clauses` (Clausulas de cada modelo)

```sql
CREATE TABLE template_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  clause_id UUID REFERENCES contract_clauses(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  conteudo_html TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Cada modelo tem suas clausulas com ordem especifica. O `clause_id` referencia a clausula base (opcional - permite clausulas personalizadas so daquele modelo). O `conteudo_html` pode ser editado independentemente da clausula base.

### 3. RLS Policies

- Admin: CRUD total em ambas as tabelas
- Autenticados: SELECT em ambas as tabelas (para preview/geracao)

### 4. Mudancas na Interface (`ModelosContrato.tsx`)

**Editor refatorado:**
- Substituir o textarea HTML unico por uma lista de clausulas ordenavel (drag-and-drop com botoes de mover)
- Cada clausula: titulo editavel + editor de texto (textarea ou rich text) + painel de variaveis
- Botao "+ Adicionar Clausula" que permite criar nova ou escolher da biblioteca
- Botoes de reordenar (setas cima/baixo) e remover clausula
- Preview que monta o HTML final concatenando todas as clausulas

### 5. Mudancas no Backend (Edge Function `gerar-contrato-pdf`)

- Em vez de buscar `conteudo_html` direto do `document_templates`, buscar todas as `template_clauses` ordenadas
- Montar o HTML final: cabecalho + clausulas numeradas + rodape
- Cada clausula vira uma secao com titulo em negrito e conteudo abaixo
- Substituir variaveis em cada clausula individualmente
- O campo `conteudo_html` do `document_templates` passa a ser gerado automaticamente (ou mantido como cache)

### 6. Estrutura HTML gerada automaticamente

O sistema vai montar o HTML final assim:

```text
[Logo / Cabecalho]

CLAUSULA 1 - OBJETO DO CONTRATO
[conteudo da clausula com variaveis substituidas]

CLAUSULA 2 - VALORES E PAGAMENTO  
[conteudo da clausula com variaveis substituidas]

CLAUSULA 3 - PRAZO E VIGENCIA
[conteudo da clausula com variaveis substituidas]

...

[Data e Assinaturas]
```

### 7. Migracao dos modelos existentes

- Os modelos atuais que ja tem HTML serao mantidos como estao (compatibilidade)
- Novos modelos usarao o sistema de clausulas
- Um campo `usa_clausulas` (boolean) no `document_templates` indicara qual sistema o modelo usa

### 8. Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabelas `contract_clauses` e `template_clauses` |
| `src/pages/ModelosContrato.tsx` | Refatorar editor para sistema de clausulas |
| `src/components/ClauseEditor.tsx` | Novo componente para editar uma clausula |
| `src/components/ClauseList.tsx` | Novo componente lista ordenavel de clausulas |
| `src/components/ClauseLibrary.tsx` | Dialog para escolher clausulas da biblioteca |
| `supabase/functions/gerar-contrato-pdf/index.ts` | Buscar clausulas e montar HTML final |
| `src/lib/supabase-types.ts` | Adicionar tipos para as novas entidades |
| `src/components/ContractPreview.tsx` | Ajustar para montar preview a partir de clausulas |

