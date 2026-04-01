-- Política para Operacional criar pedidos
CREATE POLICY "Operacional cria pedidos"
ON public.pedidos
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));

-- Política para Operacional editar pedidos
CREATE POLICY "Operacional edita pedidos"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'operacional'::app_role))
WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));