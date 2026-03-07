
-- Add data_entrada_fila column
ALTER TABLE public.pedidos ADD COLUMN data_entrada_fila timestamp with time zone;

-- Backfill: set data_entrada_fila for existing pedidos in "Aguardando Financeiro"
UPDATE public.pedidos SET data_entrada_fila = updated_at WHERE financeiro_status = 'Aguardando Financeiro' AND data_entrada_fila IS NULL;

-- Create trigger to auto-set data_entrada_fila when financeiro_status changes to "Aguardando Financeiro"
CREATE OR REPLACE FUNCTION public.set_data_entrada_fila()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.financeiro_status = 'Aguardando Financeiro' AND (OLD.financeiro_status IS DISTINCT FROM 'Aguardando Financeiro') THEN
    NEW.data_entrada_fila := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_data_entrada_fila
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.set_data_entrada_fila();

-- Also handle INSERT (new pedidos created directly as Aguardando Financeiro)
CREATE TRIGGER trg_set_data_entrada_fila_insert
BEFORE INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.set_data_entrada_fila();
