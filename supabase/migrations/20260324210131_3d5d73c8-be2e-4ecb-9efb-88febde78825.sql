UPDATE contratos_vendedor_lembretes 
SET lembrete_24h_enviado = true, lembrete_24h_em = now() 
WHERE contrato_id = 'db7f8d7c-6774-4251-89c9-b3ab15e3dd7e';