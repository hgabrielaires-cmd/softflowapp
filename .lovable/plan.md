
# Página de Contratos — Fluxo pós-aprovação financeira

## Objetivo

Quando o financeiro aprovar um pedido na **Fila do Financeiro**, o sistema deve criar automaticamente um registro na tabela `contratos` e redirecionar para a página `/contratos`, onde o usuário poderá executar as ações do contrato (visualizar, gerar documento, etc.).

---

## Situação Atual

- A rota `/contratos` existe mas está como `ComingSoon` (página em breve).
- A tabela `contratos` já existe no banco com: `id`, `cliente_id`, `plano_id`, `numero_registro`, `numero_exibicao`, `tipo`, `status`, `pedido_id`, `contrato_origem_id`, `created_at`, `updated_at`.
- O trigger `gerar_numero_exibicao_contrato` já gera o `numero_exibicao` automaticamente no formato `AAAA-SERIAL`.
- Atualmente, `handleAprovar` em `Financeiro.tsx` apenas atualiza o pedido — **não cria o contrato**.
- Há um pedido aprovado (`contrato_liberado: true`) mas sem contrato vinculado na tabela `contratos`.

---

## O Que Será Feito

### 1. `src/pages/Financeiro.tsx` — Criar contrato ao aprovar

Dentro da função `handleAprovar`, após atualizar o pedido com sucesso, inserir um registro na tabela `contratos`:

```
INSERT INTO contratos (cliente_id, plano_id, pedido_id, tipo, status)
VALUES (pedido.cliente_id, pedido.plano_id, pedido.id, 'Base', 'Ativo')
```

Após a inserção bem-sucedida, redirecionar para `/contratos` usando `useNavigate`.

> Nota: O `numero_exibicao` é gerado automaticamente pelo trigger do banco de dados.

---

### 2. `src/pages/Contratos.tsx` — Criar a página de gestão de contratos (novo arquivo)

Substituir o `ComingSoon` por uma página funcional com:

**Cabeçalho**
- Título "Contratos" com subtítulo
- Contador de contratos ativos

**Filtros**
- Filtro por filial
- Filtro por status (Ativo / Encerrado)
- Filtro por data (De / Até)

**Tabela de contratos** com colunas:
| Nº Contrato | Cliente | Plano | Tipo | Status | Data | Ações |
|---|---|---|---|---|---|---|

- Badge de status: verde para Ativo, cinza para Encerrado
- Badge de tipo: azul para Base, amarelo para Termo Aditivo

**Ações por linha:**
- Olho (👁) — Abrir modal de detalhes do contrato
- Ícone de documento — Gerar contrato (placeholder por ora, marcado como "em breve")

**Modal de detalhes** com:
- Número do contrato, cliente, plano, tipo, status, data de criação
- Link para o pedido de origem
- Botão "Encerrar contrato" (apenas para admin/financeiro)

---

### 3. `src/App.tsx` — Substituir `ComingSoon` pela nova página

```tsx
import Contratos from "./pages/Contratos";
// ...
<Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
```

---

## Acesso e Permissões

- A rota `/contratos` já está visível para todos os papéis no menu lateral (exceto técnico).
- A query do Supabase respeitará as RLS já configuradas:
  - Admin e Financeiro: veem todos os contratos
  - Vendedor: vê contratos dos clientes da sua filial
  - Técnico: vê todos (somente leitura)

---

## Fluxo Completo

```text
Financeiro aprova pedido
        ↓
handleAprovar() atualiza pedido:
  financeiro_status = "Aprovado"
  status_pedido = "Aprovado Financeiro"
  contrato_liberado = true
        ↓
Insere na tabela contratos:
  cliente_id, plano_id, pedido_id, tipo="Base", status="Ativo"
        ↓
Toast de sucesso: "Pedido aprovado! Contrato criado."
        ↓
Redireciona para /contratos
```

---

## Arquivos Modificados / Criados

| Arquivo | Operação |
|---|---|
| `src/pages/Financeiro.tsx` | Modificar — inserir contrato + redirecionar |
| `src/pages/Contratos.tsx` | Criar — página completa de gestão de contratos |
| `src/App.tsx` | Modificar — trocar ComingSoon pela nova página |
