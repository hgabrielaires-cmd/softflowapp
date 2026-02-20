

## Ajuste: Centralizar assinaturas no meio da página 10

### Problema atual
As assinaturas ainda estão muito no topo da última página. O espaçamento atual é:
- `.footer-note` (aviso "Atenção"): `margin: 10px 0 30px 0;` (apenas 30px abaixo)
- `.signature-section`: `margin-top: 50px;`

Total de espaço antes das assinaturas: ~80px -- insuficiente para centralizá-las na página.

### Solução
Aumentar o `margin-top` da `.signature-section` de `50px` para `280px`, o que empurra as assinaturas para o meio da página. Não alterar nenhuma outra seção.

Além disso, aumentar o bottom margin do `.footer-note` de `30px` para `60px` para dar mais respiro entre o aviso e as assinaturas.

### Detalhes técnicos
Duas queries SQL `UPDATE` com `replace()`:

**1. Footer-note (aviso "Atenção") -- mais espaço abaixo:**
```sql
UPDATE document_templates
SET conteudo_html = replace(
  conteudo_html,
  'margin: 10px 0 30px 0;',
  'margin: 10px 0 60px 0;'
)
WHERE id = '90b43be1-9659-4550-aedb-b39245d61657';
```

**2. Signature-section -- descer para o meio da página:**
```sql
UPDATE document_templates
SET conteudo_html = replace(
  conteudo_html,
  'margin-top: 50px;',
  'margin-top: 280px;'
)
WHERE id = '90b43be1-9659-4550-aedb-b39245d61657';
```

Nota: há apenas 1 ocorrência de cada string no template, então apenas a seção de assinaturas será afetada.

Após as alterações, o PDF do contrato 2026-0007 será regenerado para validação visual.
