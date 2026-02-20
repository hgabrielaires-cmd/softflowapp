

## Ajuste final: descer assinaturas 30px abaixo do aviso "Atenção"

### Problema
O aviso "Atenção: É indispensável a assinatura eletrônica..." ainda tem `margin: 10px 0;`, sem o espaçamento inferior de 30px solicitado. As assinaturas já estão empilhadas verticalmente (coluna) com gap de 60px -- isso está correto.

### Correção
Uma única query SQL `UPDATE` usando `replace()` para trocar o margin do bloco do aviso:
- **De:** `margin: 10px 0;`
- **Para:** `margin: 10px 0 40px 0;` (40px inferior = 10px original + 30px adicional)

Após a alteração, o PDF do contrato 2026-0007 será regenerado para validação visual.

### Detalhes técnicos
```sql
UPDATE document_templates
SET conteudo_html = replace(
  conteudo_html,
  'margin: 10px 0;',
  'margin: 10px 0 40px 0;'
)
WHERE id = '90b43be1-9659-4550-aedb-b39245d61657';
```
Seguido de chamada à edge function `gerar-contrato-pdf` para regenerar o PDF de teste.
