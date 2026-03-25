
-- Normalize BR phones: insert 9 after DDD for 10-digit numbers
-- Also remove country code 55 prefix if present

-- 1. cliente_contatos
UPDATE public.cliente_contatos
SET telefone = substr(telefone_clean, 1, 2) || '9' || substr(telefone_clean, 3)
FROM (
  SELECT id, regexp_replace(
    CASE WHEN regexp_replace(telefone, '\D', '', 'g') ~ '^55' AND length(regexp_replace(telefone, '\D', '', 'g')) >= 12
         THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
         ELSE regexp_replace(telefone, '\D', '', 'g')
    END, '\D', '', 'g') AS telefone_clean
  FROM public.cliente_contatos
  WHERE telefone IS NOT NULL
) sub
WHERE cliente_contatos.id = sub.id
  AND length(sub.telefone_clean) = 10;

-- 2. Also normalize all cliente_contatos to digits-only (remove formatting)
UPDATE public.cliente_contatos
SET telefone = CASE
  WHEN regexp_replace(telefone, '\D', '', 'g') ~ '^55' AND length(regexp_replace(telefone, '\D', '', 'g')) >= 12
  THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
  ELSE regexp_replace(telefone, '\D', '', 'g')
END
WHERE telefone IS NOT NULL AND telefone ~ '\D';

-- 3. chat_conversas.numero_cliente - fix 10-digit
UPDATE public.chat_conversas
SET numero_cliente = substr(nc_clean, 1, 2) || '9' || substr(nc_clean, 3)
FROM (
  SELECT id, CASE
    WHEN regexp_replace(numero_cliente, '\D', '', 'g') ~ '^55' AND length(regexp_replace(numero_cliente, '\D', '', 'g')) >= 12
    THEN substr(regexp_replace(numero_cliente, '\D', '', 'g'), 3)
    ELSE regexp_replace(numero_cliente, '\D', '', 'g')
  END AS nc_clean
  FROM public.chat_conversas
  WHERE numero_cliente IS NOT NULL
) sub
WHERE chat_conversas.id = sub.id
  AND length(sub.nc_clean) = 10;

-- 4. chat_conversas - normalize to digits-only
UPDATE public.chat_conversas
SET numero_cliente = CASE
  WHEN regexp_replace(numero_cliente, '\D', '', 'g') ~ '^55' AND length(regexp_replace(numero_cliente, '\D', '', 'g')) >= 12
  THEN substr(regexp_replace(numero_cliente, '\D', '', 'g'), 3)
  ELSE regexp_replace(numero_cliente, '\D', '', 'g')
END
WHERE numero_cliente IS NOT NULL AND numero_cliente ~ '\D';

-- 5. clientes.telefone - fix 10-digit
UPDATE public.clientes
SET telefone = substr(tel_clean, 1, 2) || '9' || substr(tel_clean, 3)
FROM (
  SELECT id, CASE
    WHEN regexp_replace(telefone, '\D', '', 'g') ~ '^55' AND length(regexp_replace(telefone, '\D', '', 'g')) >= 12
    THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
    ELSE regexp_replace(telefone, '\D', '', 'g')
  END AS tel_clean
  FROM public.clientes
  WHERE telefone IS NOT NULL
) sub
WHERE clientes.id = sub.id
  AND length(sub.tel_clean) = 10;

-- 6. clientes - normalize to digits-only
UPDATE public.clientes
SET telefone = CASE
  WHEN regexp_replace(telefone, '\D', '', 'g') ~ '^55' AND length(regexp_replace(telefone, '\D', '', 'g')) >= 12
  THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
  ELSE regexp_replace(telefone, '\D', '', 'g')
END
WHERE telefone IS NOT NULL AND telefone ~ '\D';

-- 7. crm_oportunidade_contatos.telefone - fix 10-digit
UPDATE public.crm_oportunidade_contatos
SET telefone = substr(tel_clean, 1, 2) || '9' || substr(tel_clean, 3)
FROM (
  SELECT id, CASE
    WHEN regexp_replace(telefone, '\D', '', 'g') ~ '^55' AND length(regexp_replace(telefone, '\D', '', 'g')) >= 12
    THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
    ELSE regexp_replace(telefone, '\D', '', 'g')
  END AS tel_clean
  FROM public.crm_oportunidade_contatos
  WHERE telefone IS NOT NULL
) sub
WHERE crm_oportunidade_contatos.id = sub.id
  AND length(sub.tel_clean) = 10;

-- 8. crm_oportunidade_contatos - normalize to digits-only
UPDATE public.crm_oportunidade_contatos
SET telefone = CASE
  WHEN regexp_replace(telefone, '\D', '', 'g') ~ '^55' AND length(regexp_replace(telefone, '\D', '', 'g')) >= 12
  THEN substr(regexp_replace(telefone, '\D', '', 'g'), 3)
  ELSE regexp_replace(telefone, '\D', '', 'g')
END
WHERE telefone IS NOT NULL AND telefone ~ '\D';
