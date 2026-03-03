
-- =============================================
-- FIX: Convert role-based RLS from RESTRICTIVE to PERMISSIVE
-- Problem: All policies were RESTRICTIVE (AND logic), making it impossible
-- for any single role to access data. They should be PERMISSIVE (OR logic).
-- Only the filial filter remains RESTRICTIVE.
-- =============================================

-- ==================== CLIENTES ====================
-- Drop role-based RESTRICTIVE policies
DROP POLICY IF EXISTS "Admin gerencia clientes" ON public.clientes;
DROP POLICY IF EXISTS "Financeiro gerencia clientes" ON public.clientes;
DROP POLICY IF EXISTS "Tecnico visualiza clientes" ON public.clientes;
DROP POLICY IF EXISTS "Vendedor cadastra clientes na sua filial" ON public.clientes;
DROP POLICY IF EXISTS "Vendedor visualiza clientes da sua filial" ON public.clientes;

-- Recreate as PERMISSIVE
CREATE POLICY "Admin gerencia clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor gerencia clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional gerencia clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Financeiro gerencia clientes"
  ON public.clientes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Tecnico visualiza clientes"
  ON public.clientes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Vendedor visualiza clientes da sua filial"
  ON public.clientes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Vendedor cadastra clientes na sua filial"
  ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));

-- ==================== CONTRATOS ====================
DROP POLICY IF EXISTS "Admin gerencia contratos" ON public.contratos;
DROP POLICY IF EXISTS "Financeiro gerencia contratos" ON public.contratos;
DROP POLICY IF EXISTS "Financeiro visualiza contratos" ON public.contratos;
DROP POLICY IF EXISTS "Tecnico visualiza contratos da sua filial" ON public.contratos;
DROP POLICY IF EXISTS "Vendedor visualiza contratos da sua filial" ON public.contratos;

CREATE POLICY "Admin gerencia contratos"
  ON public.contratos FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor gerencia contratos"
  ON public.contratos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional gerencia contratos"
  ON public.contratos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Financeiro gerencia contratos"
  ON public.contratos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Tecnico visualiza contratos"
  ON public.contratos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Vendedor visualiza contratos"
  ON public.contratos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

-- ==================== CLIENTE_CONTATOS ====================
DROP POLICY IF EXISTS "Admin gerencia contatos" ON public.cliente_contatos;
DROP POLICY IF EXISTS "Financeiro gerencia contatos" ON public.cliente_contatos;
DROP POLICY IF EXISTS "Tecnico visualiza contatos" ON public.cliente_contatos;
DROP POLICY IF EXISTS "Vendedor edita contatos da sua filial" ON public.cliente_contatos;
DROP POLICY IF EXISTS "Vendedor gerencia contatos da sua filial" ON public.cliente_contatos;
DROP POLICY IF EXISTS "Vendedor visualiza contatos da sua filial" ON public.cliente_contatos;

CREATE POLICY "Admin gerencia contatos"
  ON public.cliente_contatos FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor gerencia contatos"
  ON public.cliente_contatos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional gerencia contatos"
  ON public.cliente_contatos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Financeiro gerencia contatos"
  ON public.cliente_contatos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Tecnico visualiza contatos"
  ON public.cliente_contatos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Vendedor visualiza contatos"
  ON public.cliente_contatos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Vendedor insere contatos"
  ON public.cliente_contatos FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role));

CREATE POLICY "Vendedor edita contatos"
  ON public.cliente_contatos FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

-- ==================== CONTRATOS_ZAPSIGN ====================
DROP POLICY IF EXISTS "Admin gerencia contratos_zapsign" ON public.contratos_zapsign;
DROP POLICY IF EXISTS "Financeiro gerencia contratos_zapsign" ON public.contratos_zapsign;
DROP POLICY IF EXISTS "Tecnico visualiza contratos_zapsign da sua filial" ON public.contratos_zapsign;
DROP POLICY IF EXISTS "Vendedor visualiza contratos_zapsign da sua filial" ON public.contratos_zapsign;

CREATE POLICY "Admin gerencia contratos_zapsign"
  ON public.contratos_zapsign FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor gerencia contratos_zapsign"
  ON public.contratos_zapsign FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional visualiza contratos_zapsign"
  ON public.contratos_zapsign FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Financeiro gerencia contratos_zapsign"
  ON public.contratos_zapsign FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Tecnico visualiza contratos_zapsign"
  ON public.contratos_zapsign FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Vendedor visualiza contratos_zapsign"
  ON public.contratos_zapsign FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));
