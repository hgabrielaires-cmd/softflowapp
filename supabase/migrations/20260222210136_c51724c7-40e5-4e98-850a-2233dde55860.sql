-- Atualizar trigger para gerar numeração com prefixo por tipo
CREATE OR REPLACE FUNCTION public.gerar_numero_exibicao_contrato()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tipo = 'Aditivo' THEN
    NEW.numero_exibicao := 'AD-' || LPAD(NEW.numero_registro::text, 4, '0');
  ELSIF NEW.tipo = 'OA' THEN
    NEW.numero_exibicao := 'OA-' || LPAD(NEW.numero_registro::text, 4, '0');
  ELSIF NEW.tipo = 'Cancelamento' THEN
    NEW.numero_exibicao := 'CA-' || LPAD(NEW.numero_registro::text, 4, '0');
  ELSE
    NEW.numero_exibicao := TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.numero_registro::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;