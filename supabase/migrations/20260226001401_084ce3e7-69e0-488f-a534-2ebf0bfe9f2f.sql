
-- 1) Vendedor: só vê seus próprios pedidos
DROP POLICY IF EXISTS "Vendedor visualiza pedidos da sua filial" ON public.pedidos;
CREATE POLICY "Vendedor visualiza seus pedidos"
  ON public.pedidos FOR SELECT
  USING (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND vendedor_id = auth.uid()
  );

-- 2) Vendedor cria pedidos: manter vinculado ao próprio user
DROP POLICY IF EXISTS "Vendedor cria pedidos na sua filial" ON public.pedidos;
CREATE POLICY "Vendedor cria seus pedidos"
  ON public.pedidos FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND vendedor_id = auth.uid()
  );

-- 3) Vendedor edita pedido reprovado: manter só seus
DROP POLICY IF EXISTS "Vendedor pode editar pedido reprovado" ON public.pedidos;
CREATE POLICY "Vendedor edita pedido reprovado"
  ON public.pedidos FOR UPDATE
  USING (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND vendedor_id = auth.uid()
    AND financeiro_status = 'Reprovado'
  )
  WITH CHECK (
    has_role(auth.uid(), 'vendedor'::app_role)
    AND vendedor_id = auth.uid()
  );

-- 4) Admin: só vê pedidos das filiais vinculadas (ou todas se acesso_global)
DROP POLICY IF EXISTS "Admin gerencia pedidos" ON public.pedidos;
CREATE POLICY "Admin gerencia pedidos"
  ON public.pedidos FOR ALL
  USING (
    is_admin(auth.uid())
    AND (
      (SELECT acesso_global FROM profiles WHERE user_id = auth.uid() LIMIT 1) = true
      OR filial_id IN (
        SELECT uf.filial_id FROM usuario_filiais uf WHERE uf.user_id = auth.uid()
        UNION
        SELECT p.filial_id FROM profiles p WHERE p.user_id = auth.uid() AND p.filial_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    is_admin(auth.uid())
    AND (
      (SELECT acesso_global FROM profiles WHERE user_id = auth.uid() LIMIT 1) = true
      OR filial_id IN (
        SELECT uf.filial_id FROM usuario_filiais uf WHERE uf.user_id = auth.uid()
        UNION
        SELECT p.filial_id FROM profiles p WHERE p.user_id = auth.uid() AND p.filial_id IS NOT NULL
      )
    )
  );

-- 5) Financeiro: também restringir por filiais vinculadas
DROP POLICY IF EXISTS "Financeiro visualiza pedidos" ON public.pedidos;
CREATE POLICY "Financeiro visualiza pedidos"
  ON public.pedidos FOR SELECT
  USING (
    has_role(auth.uid(), 'financeiro'::app_role)
    AND (
      (SELECT acesso_global FROM profiles WHERE user_id = auth.uid() LIMIT 1) = true
      OR filial_id IN (
        SELECT uf.filial_id FROM usuario_filiais uf WHERE uf.user_id = auth.uid()
        UNION
        SELECT p.filial_id FROM profiles p WHERE p.user_id = auth.uid() AND p.filial_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Financeiro pode atualizar status financeiro" ON public.pedidos;
CREATE POLICY "Financeiro atualiza pedidos"
  ON public.pedidos FOR UPDATE
  USING (
    has_role(auth.uid(), 'financeiro'::app_role)
    AND (
      (SELECT acesso_global FROM profiles WHERE user_id = auth.uid() LIMIT 1) = true
      OR filial_id IN (
        SELECT uf.filial_id FROM usuario_filiais uf WHERE uf.user_id = auth.uid()
        UNION
        SELECT p.filial_id FROM profiles p WHERE p.user_id = auth.uid() AND p.filial_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'financeiro'::app_role)
  );
