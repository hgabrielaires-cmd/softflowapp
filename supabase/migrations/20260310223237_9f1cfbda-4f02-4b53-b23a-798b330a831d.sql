
DROP POLICY "Authenticated users can insert lembretes" ON public.contratos_vendedor_lembretes;

CREATE POLICY "Users can insert lembretes for contracts they manage"
  ON public.contratos_vendedor_lembretes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contratos c
      JOIN public.pedidos p ON p.id = c.pedido_id
      WHERE c.id = contrato_id
      AND p.vendedor_id = auth.uid()
    )
    OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Service role can update lembretes"
  ON public.contratos_vendedor_lembretes
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
