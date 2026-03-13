UPDATE document_templates 
SET conteudo_html = REPLACE(
  conteudo_html, 
  'CONTRATO ORIGINAL Nº {{contrato.numero}} PERMANECEM INALTERADAS', 
  'CONTRATO ORIGINAL Nº {{contrato.numero_origem}} PERMANECEM INALTERADAS'
)
WHERE id = '22a2eed2-f6ea-4700-95df-62e4475e6540';