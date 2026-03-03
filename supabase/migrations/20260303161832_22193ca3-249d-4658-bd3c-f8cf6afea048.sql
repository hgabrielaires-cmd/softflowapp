UPDATE public.message_templates 
SET conteudo = REPLACE(conteudo, 'bom dia!', '{saudacao}!'),
    updated_at = now()
WHERE id IN ('6873a943-2ba7-44f7-9df6-c38a29bd68ca', '61c0722a-3297-49df-be8d-6322ee131f9b', 'f3b62c02-535d-4c40-aabd-b089de288ed3')
AND conteudo LIKE '%bom dia!%'