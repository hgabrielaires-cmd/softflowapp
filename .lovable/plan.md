
## Plano: Anexo I como segunda pagina compacta

### Objetivo
Forcar o Anexo I para iniciar na segunda pagina (page-break) e reduzir o tamanho do cabecalho azul + subtitulo para que todo o conteudo (Plano, Modulos, Resumo de Valores) caiba na mesma pagina.

### Alteracoes no template HTML (via SQL UPDATE)

**1. Restaurar page-break-before no header do Anexo**
- Trocar `style="margin-top: 40px;"` por `style="page-break-before:always; margin-top:0; padding:6px; font-size:13px;"`
- Isso forca o Anexo para a pagina 2 e reduz o padding e fonte do banner azul

**2. Reduzir o subtitulo "ESPECIFICACOES TECNICAS E COMERCIAIS"**
- Reduzir `font-size:12px` para `font-size:10px` e `margin-bottom:20px` para `margin-bottom:8px`

**3. Reduzir espacamento dos data-box**
- Trocar `margin-bottom:12px` para `margin-bottom:6px` nos blocos de Plano e Modulos
- Reduzir padding interno via CSS da classe `.data-box`

### Detalhes tecnicos

Serao executados 1-2 updates SQL no campo `conteudo_html` da tabela `document_templates` (id `90b43be1-...`):

- REPLACE do div `anexo-header` para incluir `page-break-before:always` com padding/font reduzidos
- REPLACE do paragrafo de especificacoes para fonte menor e menos margem
- REPLACE dos `margin-bottom:12px` para `margin-bottom:6px` nos data-box do anexo

Tambem sera ajustado o CSS da classe `.anexo-header` no bloco `<style>` para reduzir o `margin: 40px 0 25px` para `margin: 0 0 8px` e `padding: 12px` para `padding: 6px`.
