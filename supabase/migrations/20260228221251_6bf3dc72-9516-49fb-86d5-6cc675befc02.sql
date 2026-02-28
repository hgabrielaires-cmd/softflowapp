
-- 1. Técnicos: restringir contratos à filial do técnico
DROP POLICY IF EXISTS "Tecnico visualiza contratos" ON public.contratos;
CREATE POLICY "Tecnico visualiza contratos da sua filial"
  ON public.contratos FOR SELECT
  USING (
    has_role(auth.uid(), 'tecnico'::app_role) AND
    cliente_id IN (
      SELECT c.id FROM clientes c
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE c.filial_id = p.filial_id
    )
  );

-- Técnicos: restringir contratos_zapsign à filial
DROP POLICY IF EXISTS "Tecnico visualiza contratos_zapsign" ON public.contratos_zapsign;
CREATE POLICY "Tecnico visualiza contratos_zapsign da sua filial"
  ON public.contratos_zapsign FOR SELECT
  USING (
    has_role(auth.uid(), 'tecnico'::app_role) AND
    contrato_id IN (
      SELECT ct.id FROM contratos ct
      JOIN clientes c ON c.id = ct.cliente_id
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE c.filial_id = p.filial_id
    )
  );

-- 2. Storage pedido-anexos: restringir acesso por role + ownership
DROP POLICY IF EXISTS "Autenticados fazem upload de anexos pedidos" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados visualizam anexos pedidos" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados deletam seus anexos pedidos" ON storage.objects;

-- Upload: admin, financeiro, ou vendedor do pedido
CREATE POLICY "Upload anexos pedidos com permissao"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pedido-anexos' AND
    auth.uid() IS NOT NULL AND
    (
      is_admin(auth.uid()) OR
      has_role(auth.uid(), 'financeiro'::app_role) OR
      (
        has_role(auth.uid(), 'vendedor'::app_role) AND
        EXISTS (
          SELECT 1 FROM pedidos
          WHERE id::text = split_part(name, '/', 1)
          AND vendedor_id = auth.uid()
        )
      )
    )
  );

-- Visualizar: admin, financeiro, ou vendedor do pedido
CREATE POLICY "Visualizar anexos pedidos com permissao"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pedido-anexos' AND
    auth.uid() IS NOT NULL AND
    (
      is_admin(auth.uid()) OR
      has_role(auth.uid(), 'financeiro'::app_role) OR
      (
        has_role(auth.uid(), 'vendedor'::app_role) AND
        EXISTS (
          SELECT 1 FROM pedidos
          WHERE id::text = split_part(name, '/', 1)
          AND vendedor_id = auth.uid()
        )
      )
    )
  );

-- Deletar: apenas quem fez upload ou admin
CREATE POLICY "Deletar anexos pedidos owner ou admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pedido-anexos' AND
    (
      (owner_id)::uuid = auth.uid() OR
      is_admin(auth.uid())
    )
  );
