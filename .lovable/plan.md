

# Plano: Garantir Fidelidade Visual entre Preview e PDF

## Problema Identificado

O preview do contrato usa um **iframe com `srcDoc`**, que renderiza o HTML nativamente com suporte completo a CSS. Ja a geracao de PDF usa **html2canvas**, que "fotografa" um container HTML oculto posicionado fora da tela (`left:-9999px`). Isso causa diversas diferencas visuais:

1. **Container oculto sem estilos corretos**: O div oculto nao herda estilos do iframe e nao tem dimensoes de pagina A4 reais aplicadas (padding, margens internas, font-family).
2. **Quebra de pagina imprecisa**: O seletor `div` no algoritmo de breakpoints captura TODOS os divs (incluindo aninhados), gerando ruido nos pontos de corte. Elementos pequenos dentro de divs maiores confundem o algoritmo.
3. **Sem margens internas no PDF**: O conteudo fica colado nas bordas da pagina, diferente do preview que tem padding natural.
4. **Imagens podem nao carregar**: O container oculto pode nao aguardar corretamente imagens com CORS.

## Solucao Proposta

### 1. Aplicar estilos A4 identicos ao container oculto

Adicionar ao container oculto os mesmos estilos que o preview aplica (via `substituirVariaveis`), alem de margens internas equivalentes a uma pagina impressa real:

- Padding de 20mm (aproximadamente 76px) nas laterais e topo
- Largura util de 794px (A4 a 96dpi)
- Font-family e font-size explicitos
- Box-sizing border-box

### 2. Melhorar algoritmo de breakpoints

- Filtrar elementos do seletor para usar apenas elementos de **primeiro nivel** ou elementos com altura significativa (> 20px), evitando spans e divs inline
- Adicionar logica de "look-ahead": se um elemento comeca dentro da pagina mas termina fora, mover o corte para ANTES desse elemento
- Garantir margem de seguranca no topo de cada pagina (evitar cortar logo no inicio)

### 3. Adicionar margens ao PDF

- Aplicar margens de ~10mm no topo e laterais de cada pagina do PDF usando o parametro de offset do `addImage` do jsPDF
- Ajustar a largura da imagem para caber dentro das margens (190mm ao inves de 210mm)

### 4. Garantir carregamento de imagens

- Adicionar timeout no carregamento de imagens (maximo 5 segundos)
- Usar `crossOrigin="anonymous"` nas imagens para compatibilidade com html2canvas

---

## Detalhes Tecnicos

### Arquivo: `src/pages/Contratos.tsx`

**Container oculto (linhas 286-289):**
```text
Antes:  position:fixed;left:-9999px;top:0;width:794px;background:white;
Depois: position:fixed;left:-9999px;top:0;width:794px;background:white;
        padding:76px 56px;box-sizing:border-box;font-family:Arial,sans-serif;
        font-size:12pt;line-height:1.5;color:#000;
```

**Breakpoint algorithm (linhas 320-366):**
- Trocar o seletor de blocos para filtrar apenas elementos "significativos" (altura > 20px e nao aninhados profundamente)
- Usar logica de varredura para frente: encontrar o ULTIMO elemento que cabe inteiro na pagina, e cortar logo apos ele

**PDF margins (linhas 398-399):**
```text
Antes:  pdf.addImage(..., 0, 0, 210, sliceHeightMM)
Depois: pdf.addImage(..., 10, 10, 190, adjustedHeightMM)
```
- Ajustar `safePageHeight` para considerar as margens em mm convertidas para px

**Carregamento de imagens (linhas 292-302):**
- Adicionar timeout de 5 segundos por imagem
- Setar `crossOrigin = "anonymous"` antes de verificar se esta completa

### Arquivo: `src/lib/contract-variables.ts`

- Garantir que o estilo injetado pelo `substituirVariaveis` (max-width + padding no body) seja identico ao usado no container de PDF, para que o preview e o PDF partam do mesmo baseline visual

