
-- 1. Add missing vendedor UPDATE policy on clientes
CREATE POLICY "Vendedor edita clientes da sua filial"
ON public.clientes
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'vendedor'::app_role))
WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));

-- 2. Add audit columns to clientes table
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS criado_por uuid,
ADD COLUMN IF NOT EXISTS atualizado_por uuid;

-- 3. Trigger to auto-update updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
