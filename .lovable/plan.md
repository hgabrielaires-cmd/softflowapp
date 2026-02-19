

# Evolucao do Modulo de Modelos de Contrato - Editor HTML Moderno

## Resumo

Substituir o sistema atual baseado em upload de DOCX por um editor HTML rico integrado, com painel de variaveis dinamicas, preview em tempo real e geracao de PDF a partir de HTML. Isso elimina os problemas recorrentes de parsing DOCX (tags XML vazadas, caracteres incompativeis, ZIP corrompido) e oferece controle total sobre o layout do contrato.

---

## 1. Banco de Dados

### Nova tabela `document_templates`

Substituira a tabela `modelos_contrato` existente (que sera mantida temporariamente para compatibilidade):

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador |
| nome | text | Nome do modelo |
| tipo | text | CONTRATO_BASE, ADITIVO, CANCELAMENTO |
| filial_id | uuid (nullable, FK filiais) | Null = modelo global |
| conteudo_html | text | HTML completo do contrato |
| ativo | boolean (default true) | Status |
| versao | integer (default 1) | Controle de versao |
| created_at / updated_at | timestamptz | Timestamps |

**RLS**: Mesmas politicas do `modelos_contrato` (admin gerencia, autenticados visualizam).

**Constraint**: Trigger para garantir apenas 1 modelo ativo por tipo + filial_id.

---

## 2. Tela de Modelos de Contrato (Reescrita)

### 2.1 Listagem (ja existente, sera adaptada)
- Tabela com colunas: Nome, Tipo, Filial, Status, Versao, Acoes
- Acoes: Editar, Duplicar, Preview, Excluir

### 2.2 Editor HTML Rico (novo Dialog fullscreen)

Ao clicar em "Novo Modelo" ou "Editar":

**Layout em 2 paineis:**

```text
+----------------------------------+-------------------+
|                                  |  VARIAVEIS        |
|   EDITOR HTML                    |  [Categorias]     |
|   (textarea com destaque         |                   |
|    ou contentEditable)           |  > Cliente        |
|                                  |    {{cliente.nome}}|
|   O usuario cola/edita o HTML    |    {{cliente.cnpj}}|
|   do contrato com as clausulas   |    ...            |
|                                  |                   |
|                                  |  > Contrato       |
|                                  |    {{contrato...}} |
|                                  |                   |
|                                  |  > Valores        |
|                                  |    {{valores...}}  |
+----------------------------------+-------------------+
```

**Editor**: Sera um `<textarea>` com syntax highlighting basico (monospace, altura grande) onde o usuario pode colar HTML completo do contrato incluindo clausulas, tabelas, estilos inline, e as variaveis com sintaxe `{{variavel}}`.

**Painel lateral de variaveis**: Lista clicavel organizada por categoria. Ao clicar numa variavel, ela eh inserida na posicao do cursor no editor.

### 2.3 Logo do Modelo
- Opcao de usar a logo da filial vinculada (automatico via `{{logo.url}}`)
- Ou fazer upload de logo especifica para o modelo
- A variavel `{{logo.url}}` resolve para a logo do modelo, ou fallback para a logo da filial

---

## 3. Sistema de Variaveis Completo

Todas as variaveis disponiveis, organizadas por categoria:

**Cliente:**
- `{{cliente.razao_social}}`, `{{cliente.nome_fantasia}}`, `{{cliente.cnpj}}`, `{{cliente.inscricao_estadual}}`
- `{{cliente.endereco_completo}}`, `{{cliente.cidade}}`, `{{cliente.uf}}`, `{{cliente.cep}}`
- `{{cliente.telefone}}`, `{{cliente.email}}`

**Contato:**
- `{{contato.nome_decisor}}`, `{{contato.telefone_decisor}}`

**Contrato:**
- `{{contrato.numero}}`, `{{contrato.status}}`

**Plano:**
- `{{plano.nome}}`, `{{plano.valor_mensalidade}}`

**Modulos:**
- `{{modulos.inclusos_lista}}` - lista formatada dos modulos do plano
- `{{modulos.adicionais_lista}}` - lista de modulos adicionais contratados
- `{{modulos.tabela_detalhada}}` - tabela HTML com detalhamento (so aparece se houver adicionais)

**Valores:**
- `{{valores.implantacao.original}}`, `{{valores.implantacao.desconto}}`, `{{valores.implantacao.final}}`
- `{{valores.mensalidade.original}}`, `{{valores.mensalidade.desconto}}`, `{{valores.mensalidade.final}}`
- `{{valores.total_geral}}`, `{{valores.total_extenso}}`

**Pagamento:**
- `{{pagamento.implantacao.forma}}`, `{{pagamento.implantacao.parcelas}}`
- `{{pagamento.mensalidade.forma}}`, `{{pagamento.mensalidade.parcelas}}`
- `{{pagamento.observacoes}}`

**Sistema:**
- `{{data.atual}}`, `{{data.atual_extenso}}`
- `{{logo.url}}`

**Filial:**
- `{{filial.nome}}`

---

## 4. Preview do Contrato

Botao "Preview" na tela de modelos e na tela de contratos:

- Abre um Dialog com iframe renderizando o HTML com variaveis substituidas por dados de exemplo (no editor) ou dados reais do contrato (na tela de contratos)
- Permite validar o layout antes de gerar o PDF final

---

## 5. Geracao de PDF (Edge Function Refatorada)

A Edge Function `gerar-contrato-pdf` sera simplificada drasticamente:

**Fluxo novo:**
1. Buscar o `document_template` ativo (filial > global)
2. Buscar dados do contrato/pedido/cliente (mesmas queries atuais)
3. Substituir `{{variaveis}}` no HTML por valores reais
4. Converter HTML para PDF usando a biblioteca `jspdf` + `html2canvas` OU enviar para um servico de renderizacao
5. Upload do PDF ao bucket `contratos-pdf`
6. Atualizar status do contrato

**Abordagem de conversao HTML->PDF**: Usar a API `Deno` com `puppeteer` nao eh viavel em Edge Functions. A alternativa sera:
- Renderizar o HTML completo como string
- Usar a biblioteca `pdf-lib` para criar o PDF parseando o HTML renderizado com um parser leve
- OU usar um servico externo gratuito/nativo para a conversao

**Decisao tecnica**: Manter `pdf-lib` mas alimentar com dados parseados do HTML em vez de DOCX. O HTML sera parseado para extrair blocos de texto, tabelas e imagens, e o PDF sera construido programaticamente com melhor controle de layout.

---

## 6. Regras de Negocio

- Apenas 1 modelo ativo por tipo + filial (enforced por trigger no banco)
- Se nao houver modelo ativo, botao "Gerar Contrato" fica desabilitado com tooltip explicativo
- Bloco `{{modulos.tabela_detalhada}}` so renderiza se houver modulos adicionais
- Versionamento automatico: ao editar um modelo, a versao incrementa

---

## 7. Arquivos que serao criados/modificados

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/...` | Criar tabela `document_templates` + trigger unicidade + RLS |
| `src/pages/ModelosContrato.tsx` | Reescrever com editor HTML + painel de variaveis |
| `src/components/ContractVariablesPanel.tsx` | **Novo** - Painel lateral de variaveis |
| `src/components/ContractPreview.tsx` | **Novo** - Componente de preview HTML |
| `src/lib/contract-variables.ts` | **Novo** - Definicao de variaveis e funcao de substituicao |
| `supabase/functions/gerar-contrato-pdf/index.ts` | Refatorar para usar HTML em vez de DOCX |
| `src/pages/Contratos.tsx` | Ajustar chamada de geracao + adicionar botao Preview |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |
| `src/lib/supabase-types.ts` | Adicionar interface DocumentTemplate |

---

## 8. Sequencia de Implementacao

1. Criar tabela `document_templates` no banco (migracao)
2. Criar `contract-variables.ts` com definicoes e funcao de substituicao
3. Criar `ContractVariablesPanel.tsx` (painel lateral)
4. Criar `ContractPreview.tsx` (preview com iframe)
5. Reescrever `ModelosContrato.tsx` com editor + painel + preview
6. Refatorar Edge Function `gerar-contrato-pdf` para HTML
7. Ajustar `Contratos.tsx` para usar novo sistema

