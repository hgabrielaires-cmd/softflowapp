

## Adicionar status de assinatura na tela de Pedidos

### O que sera feito

Transformar a coluna "Financeiro" na lista de pedidos em uma coluna de progresso que mostra a evolucao do pedido: **Aprovado** -> **Contrato liberado** -> **Aguardando assinatura** -> **Contrato assinado** (ou **Recusado**). O mesmo sera exibido no dialog de visualizar pedido.

### Mudancas na logica de dados

1. **Buscar dados do ZapSign** - No `loadData()`, apos carregar os pedidos, buscar os registros de `contratos_zapsign` para os pedidos que possuem `contrato_id` (nao nulo). Armazenar em um estado `Map<contrato_id, status_zapsign>`.

2. **Novo estado** - Adicionar `zapsignMap` como `Record<string, string>` que mapeia `contrato_id` para o status da assinatura (Enviado, Pendente, Assinado, Recusado).

### Mudancas na coluna "Financeiro" da lista

Substituir a logica atual (que mostra badge do finStatus + "Contrato liberado") por uma progressao:

- Se `finStatus === "Aguardando"` -> Badge "Aguardando" (amber)
- Se `finStatus === "Reprovado"` -> Badge "Reprovado" (vermelho) + motivo
- Se `finStatus === "Cancelado"` -> Badge "Cancelado" (cinza)
- Se `finStatus === "Aprovado"` e `!contratoLiberado` -> Badge "Aprovado" (verde)
- Se `finStatus === "Aprovado"` e `contratoLiberado` e sem assinatura ZapSign -> Badge "Contrato liberado" (verde com icone)
- Se `finStatus === "Aprovado"` e `contratoLiberado` e ZapSign status "Enviado" ou "Pendente" -> Badge "Aguardando assinatura" (amber/laranja)
- Se `finStatus === "Aprovado"` e ZapSign status "Assinado" -> Badge "Contrato assinado" (verde escuro/emerald)
- Se ZapSign status "Recusado" -> Badge "Assinatura recusada" (vermelho)

### Mudancas no dialog de visualizar pedido

Na secao de status (linhas 2086-2108), adicionar o status da assinatura ZapSign abaixo do "Contrato liberado", seguindo o mesmo padrao visual.

### Detalhes tecnicos

**Arquivo:** `src/pages/Pedidos.tsx`

- Novo estado: `const [zapsignMap, setZapsignMap] = useState<Record<string, string>>({});`
- No `loadData()`, apos carregar pedidos, extrair os `contrato_id` nao nulos e fazer uma query a `contratos_zapsign` para buscar o status de cada um
- Na coluna Financeiro (linhas 1108-1121), substituir a logica condicional pela progressao descrita acima
- No dialog de visualizar (linhas 2086-2108), adicionar badge de assinatura quando aplicavel
- Icones: reutilizar `Send`, `CheckCircle`, `FileText` ja importados

