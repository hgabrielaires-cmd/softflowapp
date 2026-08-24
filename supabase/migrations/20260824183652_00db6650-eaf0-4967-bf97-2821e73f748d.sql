CREATE OR REPLACE FUNCTION public.pode_vender(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'vendedor'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = _user_id AND p.is_vendedor = true
      )
$$;

REVOKE ALL ON FUNCTION public.pode_vender(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_vender(uuid) TO authenticated, service_role;

-- pedidos
DROP POLICY IF EXISTS "Vendedor gerencia seus pedidos" ON public.pedidos;
CREATE POLICY "Vendedor gerencia seus pedidos" ON public.pedidos
FOR ALL TO authenticated
USING (public.pode_vender(auth.uid()) AND vendedor_id = auth.uid())
WITH CHECK (public.pode_vender(auth.uid()) AND vendedor_id = auth.uid());

DROP POLICY IF EXISTS "Vendedor cria seus pedidos" ON public.pedidos;
CREATE POLICY "Vendedor cria seus pedidos" ON public.pedidos
FOR INSERT TO authenticated
WITH CHECK (public.pode_vender(auth.uid()) AND vendedor_id = auth.uid());

DROP POLICY IF EXISTS "Vendedor edita pedido reprovado" ON public.pedidos;
CREATE POLICY "Vendedor edita pedido reprovado" ON public.pedidos
FOR UPDATE TO authenticated
USING (public.pode_vender(auth.uid()) AND vendedor_id = auth.uid() AND financeiro_status = 'Reprovado')
WITH CHECK (public.pode_vender(auth.uid()) AND vendedor_id = auth.uid());

-- clientes
DROP POLICY IF EXISTS "Vendedor visualiza clientes da sua filial" ON public.clientes;
CREATE POLICY "Vendedor visualiza clientes da sua filial" ON public.clientes
FOR SELECT TO authenticated
USING (public.pode_vender(auth.uid()));

DROP POLICY IF EXISTS "Vendedor cadastra clientes na sua filial" ON public.clientes;
CREATE POLICY "Vendedor cadastra clientes na sua filial" ON public.clientes
FOR INSERT TO authenticated
WITH CHECK (public.pode_vender(auth.uid()));

DROP POLICY IF EXISTS "Vendedor edita clientes da sua filial" ON public.clientes;
CREATE POLICY "Vendedor edita clientes da sua filial" ON public.clientes
FOR UPDATE TO authenticated
USING (public.pode_vender(auth.uid()))
WITH CHECK (public.pode_vender(auth.uid()));

-- cliente_contatos
DROP POLICY IF EXISTS "Vendedor visualiza contatos" ON public.cliente_contatos;
CREATE POLICY "Vendedor visualiza contatos" ON public.cliente_contatos
FOR SELECT TO authenticated
USING (public.pode_vender(auth.uid()));

DROP POLICY IF EXISTS "Vendedor insere contatos" ON public.cliente_contatos;
CREATE POLICY "Vendedor insere contatos" ON public.cliente_contatos
FOR INSERT TO authenticated
WITH CHECK (public.pode_vender(auth.uid()));

DROP POLICY IF EXISTS "Vendedor edita contatos" ON public.cliente_contatos;
CREATE POLICY "Vendedor edita contatos" ON public.cliente_contatos
FOR UPDATE TO authenticated
USING (public.pode_vender(auth.uid()));

-- pedido_comentarios
DROP POLICY IF EXISTS "Vendedor visualiza comentarios dos seus pedidos" ON public.pedido_comentarios;
CREATE POLICY "Vendedor visualiza comentarios dos seus pedidos" ON public.pedido_comentarios
FOR SELECT TO authenticated
USING (
  public.pode_vender(auth.uid())
  AND pedido_id IN (SELECT p.id FROM public.pedidos p WHERE p.vendedor_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendedor insere comentarios nos seus pedidos" ON public.pedido_comentarios;
CREATE POLICY "Vendedor insere comentarios nos seus pedidos" ON public.pedido_comentarios
FOR INSERT TO authenticated
WITH CHECK (
  public.pode_vender(auth.uid())
  AND user_id = auth.uid()
  AND pedido_id IN (SELECT p.id FROM public.pedidos p WHERE p.vendedor_id = auth.uid())
);