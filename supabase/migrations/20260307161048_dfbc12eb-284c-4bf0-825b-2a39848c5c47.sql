
CREATE OR REPLACE FUNCTION public.set_data_entrada_fila()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status_pedido = 'Aguardando Financeiro' AND (OLD IS NULL OR OLD.status_pedido IS DISTINCT FROM 'Aguardando Financeiro') THEN
    NEW.data_entrada_fila := now();
  END IF;
  RETURN NEW;
END;
$$;
