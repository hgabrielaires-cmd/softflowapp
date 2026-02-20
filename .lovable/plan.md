

## Eliminar a pagina 13 em branco do PDF

### Problema

A pagina 13 continua aparecendo em branco. As assinaturas e o copyright ja estao na pagina 12, mas o padding inferior do container principal (`contract-page` com `padding: 20mm` em todos os lados) esta empurrando o conteudo para alem do limite da pagina, gerando uma pagina vazia no final.

### Solucao

Duas alteracoes no CSS do template HTML armazenado no banco de dados:

1. **Reduzir o padding inferior** do `.contract-page` de `20mm` uniforme para `20mm 20mm 10mm 20mm` (top, right, bottom, left), reduzindo apenas o padding inferior para 10mm.

2. **Adicionar regra `@page`** para controlar as margens de impressao e evitar espacamento extra do navegador:
   ```css
   @page { margin: 10mm 0; }
   ```

### Detalhes tecnicos

Uma unica query SQL `UPDATE` usando `replace()` para:
- Trocar `padding: 20mm;` por `padding: 20mm 20mm 10mm 20mm;` no `.contract-page`
- Inserir a regra `@page` logo antes do fechamento do `</style>`

Nenhum arquivo de codigo sera alterado -- apenas o conteudo HTML no banco de dados.

