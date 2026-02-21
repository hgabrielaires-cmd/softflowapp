
## Padronizar badges de status na lista de contratos

### O que sera feito

1. **Centralizar a legenda "Aguardando assinatura"** - Na funcao `getZapSignStatusBadge`, a legenda `text-[10px]` hoje tem `pl-1` (padding esquerdo) que desalinha. Trocar para `text-center` para ficar centralizada abaixo do badge "Enviado".

2. **Padronizar todos os badges de status** - Garantir que todos os badges (`getStatusBadge`, `getStatusGeracaoBadge`, `getTipoBadge`, `getPedidoStatusBadges`, `getZapSignStatusBadge`) sigam o mesmo padrao visual:
   - Todos com `text-xs`
   - Todos com `flex items-center gap-1`
   - Todos com `w-fit`
   - Icone de 3x3 antes do texto quando aplicavel

### Detalhes tecnicos

**Arquivo:** `src/pages/Contratos.tsx`

- **`getZapSignStatusBadge`** (linha 437): trocar `pl-1` por `text-center w-full` na span de "Aguardando assinatura"
- **`getStatusBadge`** (linhas 443-451): adicionar `text-xs flex items-center gap-1 w-fit` nos badges de "Ativo" e "Encerrado", e adicionar icones (CheckCircle2 para Ativo, icone neutro para Encerrado)
- **`getTipoBadge`** (linhas 468-488): adicionar `text-xs w-fit` nos badges que nao tem
- **`getPedidoStatusBadges`** (linhas 490-506): adicionar `flex items-center gap-1` nos badges que nao tem
