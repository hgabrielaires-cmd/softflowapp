
-- Add sequential number and display number to pedidos
ALTER TABLE public.pedidos 
ADD COLUMN numero_registro SERIAL,
ADD COLUMN numero_exibicao TEXT NOT NULL DEFAULT '';

-- Generate display numbers for existing pedidos
UPDATE public.pedidos 
SET numero_exibicao = 'PED-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(numero_registro::text, 4, '0');

-- Create trigger to auto-generate numero_exibicao on insert
CREATE OR REPLACE FUNCTION public.gerar_numero_exibicao_pedido()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.numero_exibicao := 'PED-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEW.numero_registro::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_gerar_numero_pedido
BEFORE INSERT ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.gerar_numero_exibicao_pedido();
