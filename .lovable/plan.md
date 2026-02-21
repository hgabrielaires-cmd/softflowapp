

## Melhorar visual dos cards de integracoes com logos maiores

### O que sera feito

1. **Aumentar as logos para destaque visual** - Trocar o tamanho das logos de `h-14 w-14` para `h-20 w-20`, tornando-as o elemento principal do card.

2. **Reorganizar o layout do card** - Colocar a logo centralizada no topo do card (acima do titulo), removendo o layout lado-a-lado atual. O titulo e descricao ficam abaixo da logo, centralizados.

3. **Ajustar o container da logo** - Aumentar o container para acomodar a logo maior, com padding adequado e fundo sutil (ex: `bg-muted/30` com borda arredondada) para dar destaque.

4. **Manter funcionalidade** - Badge de status, lista de funcionalidades e botao "Ver configuracoes" continuam funcionando normalmente.

### Detalhes tecnicos

**Arquivo:** `src/pages/Integracoes.tsx`

- No array `integrationDefs`, alterar className das imgs de `h-14 w-14` para `h-20 w-20`
- No componente `IntegrationCard`, reestruturar o `CardHeader`:
  - Logo centralizada no topo com container `h-24 w-24 mx-auto`
  - Badge de status posicionado no canto superior direito (absolute)
  - Titulo e descricao centralizados abaixo da logo
- Manter o `CardContent` com a lista de detalhes e botao de configuracao sem alteracao

