
# Conectar Modelo DOCX ao Fluxo de Geração de Contrato

## Visão Geral

O objetivo é criar um fluxo completo de geração de contrato em PDF a partir de um modelo DOCX cadastrado, substituindo os marcadores `#CAMPO#` com dados reais do cliente, pedido e plano. O PDF gerado será salvo no banco e poderá ser visualizado/baixado diretamente na tela de contratos.

---

## Análise do Estado Atual

**O que já existe:**
- Tabela `modelos_contrato` com upload de DOCX e bucket privado `modelos-contrato`
- Edge Function `extrair-variaveis-docx` que lê o XML interno do DOCX
- Botão "Gerar Contrato" na tela de contratos (atualmente mostra toast de "em desenvolvimento")
- Tabela `contratos` com `status`, `pedido_id`, `cliente_id`, `plano_id`
- Dados completos do pedido carregados na tela de contratos (valores, módulos adicionais, observações, formas de pagamento)
- Contatos do cliente carregados (para obter o decisor)

**O que precisa ser criado/adicionado:**
- Colunas `pdf_url` e `status_geracao` na tabela `contratos`
- Colunas de endereço (`cep`, `logradouro`, `numero`, `complemento`, `bairro`) na tabela `clientes` (UI já existe mas não salva)
- Nova Edge Function `gerar-contrato-pdf` que faz a substituição de variáveis e geração de PDF
- Um bucket de storage para PDFs gerados (`contratos-pdf`)
- Lógica de busca do modelo correto (filial > global)
- UI de visualização/download do PDF no modal de detalhes do contrato

---

## Arquitetura da Solução

```text
[Usuário clica "Gerar Contrato"]
        |
        v
[Frontend busca modelo ativo]
  1. filial do pedido → modelos_contrato (ativo=true, tipo="Contrato Base", filial_id = filial do pedido)
  2. Se não achar → busca global (filial_id IS NULL, ativo=true)
  3. Se não achar → bloqueia com erro
        |
        v
[Edge Function: gerar-contrato-pdf]
  - Recebe: contrato_id
  - Busca todos os dados: cliente, pedido, plano, módulos, contatos, filial_parametros
  - Baixa o DOCX do storage
  - Substitui todos os marcadores #CAMPO# no XML interno
  - Converte DOCX → PDF usando biblioteca Deno
  - Faz upload do PDF no bucket contratos-pdf
  - Atualiza contratos SET pdf_url = ..., status_geracao = "Gerado"
        |
        v
[Frontend]
  - Recarrega contrato
  - Exibe botão "Ver PDF" / "Baixar PDF"
```

---

## Detalhamento Técnico

### 1. Migrações de Banco de Dados

**Tabela `clientes` — colunas de endereço faltantes:**
```sql
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS cep text NULL,
  ADD COLUMN IF NOT EXISTS logradouro text NULL,
  ADD COLUMN IF NOT EXISTS numero text NULL,
  ADD COLUMN IF NOT EXISTS complemento text NULL,
  ADD COLUMN IF NOT EXISTS bairro text NULL;
```

**Tabela `contratos` — colunas para PDF e status de geração:**
```sql
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS pdf_url text NULL,
  ADD COLUMN IF NOT EXISTS status_geracao text NULL DEFAULT 'Pendente';
```

**Storage bucket para PDFs:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-pdf', 'contratos-pdf', false)
ON CONFLICT (id) DO NOTHING;
```

**RLS no bucket:**
- Admin e financeiro podem ler/escrever
- Service role da Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` (já bypass de RLS)

### 2. Edge Function: `gerar-contrato-pdf`

A Edge Function será responsável por toda a lógica pesada de backend:

**Entrada:** `{ contrato_id: string }`

**Fluxo interno:**
1. Buscar contrato com joins: `cliente`, `pedido`, `plano`
2. Buscar contatos do cliente (decisor)
3. Buscar parâmetros da filial (`filial_parametros`)
4. Buscar modelo ativo: primeiro da filial do pedido, depois global
5. Baixar o DOCX do bucket `modelos-contrato`
6. Extrair o XML (`word/document.xml`) do ZIP do DOCX
7. Substituir todos os marcadores `#CAMPO#` com os valores reais
8. Recompor o DOCX modificado
9. Converter para PDF usando `https://esm.sh/docx-pdf` ou equivalente disponível no Deno
10. Fazer upload do PDF em `contratos-pdf/{contrato_id}.pdf`
11. Gerar signed URL e salvar em `contratos.pdf_url`
12. Atualizar `contratos.status_geracao = "Gerado"`

**Mapeamento completo de variáveis:**

| Marcador | Fonte |
|---|---|
| `#CLIENTE_RAZAO#` | `clientes.razao_social` |
| `#CLIENTE_FANTASIA#` | `clientes.nome_fantasia` |
| `#CLIENTE_CNPJ#` | `clientes.cnpj_cpf` |
| `#CLIENTE_INSC_ESTADUAL#` | `clientes.inscricao_estadual` |
| `#CLIENTE_ENDERECO_RUA#` | `clientes.logradouro` |
| `#CLIENTE_NUMERO#` | `clientes.numero` |
| `#CLIENTE_COMPLEMENTO#` | `clientes.complemento` |
| `#CLIENTE_BAIRRO#` | `clientes.bairro` |
| `#CLIENTE_CIDADE#` | `clientes.cidade` |
| `#CLIENTE_UF#` | `clientes.uf` |
| `#CLIENTE_CEP#` | `clientes.cep` |
| `#CLIENTE_TELEFONE#` | `clientes.telefone` |
| `#CLIENTE_EMAIL#` | `clientes.email` |
| `#PLANO_SERVICOS_VALOR#` | Plano nome + valor mensalidade padrão |
| `#MENSALIDADES_TOTAIS_COM_DESCRICAO_DO_PLANO#` | Plano descrição + módulos adicionais com valores |
| `#VALOR_TOTAL_IMPLANTACAO_TREINAMENTO#` | `pedidos.valor_implantacao_final` formatado |
| `#VALOR_TOTAL_SERVICO_UNICO_EXTENSO#` | `pedidos.valor_total` por extenso em português |
| `#PROPOSTA_OBSERVACOES_NEGOCIACAO#` | `pedidos.observacoes` |
| `#FORMA_DE_PAGAMENTO_MENSALIDADE#` | `pedidos.pagamento_mensalidade_forma` + parcelas |
| `#VALOR_TOTAL_MENSALIDADE#` | `pedidos.valor_mensalidade_final` formatado |
| `#PROPOSTA_OBSERVACOES_GERAIS#` | `pedidos.pagamento_mensalidade_observacao` |
| `#NOME_DECISOR#` | Contato com `decisor = true` do cliente |

> Nota sobre conversão de valor por extenso: implementaremos um conversor numérico → texto em português dentro da própria Edge Function (ex: R$ 5.000,00 → "cinco mil reais").

### 3. Estratégia de Conversão DOCX → PDF

A conversão de DOCX para PDF em ambiente Deno (sem acesso a LibreOffice/Word) é o ponto mais delicado. A abordagem será:

**Opção adotada: Substituição no XML + geração de PDF via HTML intermediário**

- Extrair o texto do `document.xml` do DOCX com marcadores substituídos
- Construir um HTML estruturado com os dados do contrato
- Usar a biblioteca `https://esm.sh/@sparticuz/chromium` (Puppeteer headless) — porém não está disponível em Deno Edge Functions

**Abordagem mais viável para Deno Edge Functions:**
- Usar `jsr:@pdf-lib/pdf-lib` para geração de PDF simples (mas perde formatação do DOCX)
- **OU** entregar o DOCX preenchido para download (sem converter para PDF) e indicar ao usuário que o PDF pode ser gerado via LibreOffice/Word ao abrir o arquivo

**Decisão de implementação:**
Dado que conversão DOCX→PDF em Deno Edge Functions não tem solução nativa de alta fidelidade sem serviços externos, adotaremos a seguinte estratégia em duas etapas:

**Etapa 1 (implementada agora):**
- A Edge Function gera o **DOCX preenchido** (substitui variáveis, recompõe o ZIP)
- Salva o DOCX preenchido no bucket `contratos-pdf` com extensão `.docx`
- Atualiza o contrato com `pdf_url` (na verdade a URL do DOCX preenchido) e `status_geracao = "Gerado"`
- O usuário baixa o DOCX já preenchido e converte localmente se necessário

**Etapa 2 (futura):**
- Integrar serviço externo de conversão (ex: CloudConvert API, LibreOffice na nuvem, ou serviço dedicado)

### 4. Alterações no Frontend (`src/pages/Contratos.tsx`)

**Novo estado:**
```typescript
const [gerando, setGerando] = useState(false);
```

**Função `handleGerarContrato`:**
1. Busca modelo ativo na filial do pedido ou global
2. Se não encontrar, exibe `toast.error` e para
3. Chama Edge Function `gerar-contrato-pdf` com `{ contrato_id }`
4. Ao retornar, atualiza o contrato na lista local com `pdf_url` e `status_geracao`
5. Exibe `toast.success`

**UI no modal de detalhes:**
- Botão "Gerar Contrato" fica com `disabled` e spinner enquanto `gerando`
- Após gerado, aparece botão "Baixar Contrato" com ícone de download
- Badge indicando `status_geracao` (Pendente / Gerado)

**Carregamento de dados adicionais no contrato:**
- Adicionar ao select de `loadData()`: `clientes(nome_fantasia, filial_id, razao_social, cnpj_cpf, inscricao_estadual, cidade, uf, cep, logradouro, numero, complemento, bairro, telefone, email)`
- Adicionar `pdf_url, status_geracao` ao select de contratos

### 5. Ajustes em `Clientes.tsx` e `Pedidos.tsx`

- Garantir que os campos de endereço (`cep`, `logradouro`, `numero`, `complemento`, `bairro`) sejam incluídos no `payload` de salvamento (a migração adiciona as colunas, e o form já tem os campos na UI)

---

## Arquivos que serão modificados

1. **`supabase/migrations/`** — Nova migração: adicionar colunas em `clientes` (endereço) e `contratos` (pdf_url, status_geracao), criar bucket `contratos-pdf`
2. **`supabase/functions/gerar-contrato-pdf/index.ts`** — Nova Edge Function
3. **`src/pages/Contratos.tsx`** — Lógica de geração + UI de download/visualização
4. **`src/pages/Clientes.tsx`** — Incluir novos campos de endereço no payload de save
5. **`src/integrations/supabase/types.ts`** — Não editar manualmente (auto-gerado)

---

## Sequência de Execução

1. Rodar migração de banco (colunas de endereço em `clientes`, `pdf_url`/`status_geracao` em `contratos`, bucket `contratos-pdf`)
2. Criar e deployar Edge Function `gerar-contrato-pdf`
3. Atualizar `Clientes.tsx` para persistir endereço completo
4. Atualizar `Contratos.tsx` com nova lógica de geração + UI de download

---

## Observações Importantes

- O bucket `contratos-pdf` será privado; o acesso ao arquivo será via signed URL com validade de 1 hora (gerada no momento do download)
- O arquivo gerado será um **DOCX preenchido** (não PDF nativo), renomeado como `.docx` no storage; a conversão para PDF real será uma evolução futura
- A variável `#VALOR_TOTAL_SERVICO_UNICO_EXTENSO#` será convertida para texto por extenso usando função interna na Edge Function
- Se o marcador não corresponder a nenhum dado disponível, será substituído por string vazia (não deixará o marcador `#CAMPO#` visível no documento final)
- Integração ZapSign não será feita nesta etapa, conforme solicitado
