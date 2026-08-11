UPDATE message_templates
SET conteudo = regexp_replace(
  regexp_replace(
    regexp_replace(conteudo, '\r\n', '\n', 'g'),
    '\r', '\n', 'g'
  ),
  '\n{3,}', '\n\n', 'g'
)
WHERE tipo = 'whatsapp_meta';