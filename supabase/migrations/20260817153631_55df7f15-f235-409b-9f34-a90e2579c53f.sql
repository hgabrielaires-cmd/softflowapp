-- FATURAS: transformar filtro de filial em RESTRICTIVE (AND com as policies de papel)
DROP POLICY IF EXISTS "Filial filter faturas" ON public.faturas;
CREATE POLICY "Filial filter faturas"
  ON public.faturas
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR filial_id IS NULL OR user_has_filial_access(filial_id))
  WITH CHECK (is_admin(auth.uid()) OR filial_id IS NULL OR user_has_filial_access(filial_id));

-- NOTAS FISCAIS
DROP POLICY IF EXISTS "Filial filter notas_fiscais" ON public.notas_fiscais;
CREATE POLICY "Filial filter notas_fiscais"
  ON public.notas_fiscais
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR filial_id IS NULL OR user_has_filial_access(filial_id))
  WITH CHECK (is_admin(auth.uid()) OR filial_id IS NULL OR user_has_filial_access(filial_id));

-- CONTRATOS FINANCEIROS: passa a ter filtro de filial
DROP POLICY IF EXISTS "Filial filter contratos_financeiros" ON public.contratos_financeiros;
CREATE POLICY "Filial filter contratos_financeiros"
  ON public.contratos_financeiros
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR filial_id IS NULL OR user_has_filial_access(filial_id))
  WITH CHECK (is_admin(auth.uid()) OR filial_id IS NULL OR user_has_filial_access(filial_id));

-- HISTORICO: escopar pelo contrato pai (que agora já é filtrado por filial)
DROP POLICY IF EXISTS "Filial filter contrato_financeiro_historico" ON public.contrato_financeiro_historico;
CREATE POLICY "Filial filter contrato_financeiro_historico"
  ON public.contrato_financeiro_historico
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.contratos_financeiros cf
      WHERE cf.id = contrato_financeiro_historico.contrato_financeiro_id
    )
  )
  WITH CHECK (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.contratos_financeiros cf
      WHERE cf.id = contrato_financeiro_historico.contrato_financeiro_id
    )
  );

-- CONTAS FINANCEIRAS: a policy "manage" (FOR ALL, só papel) reabria o SELECT para todas as filiais
DROP POLICY IF EXISTS "Filial filter fin_contas_financeiras" ON public.fin_contas_financeiras;
CREATE POLICY "Filial filter fin_contas_financeiras"
  ON public.fin_contas_financeiras
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR filial_id IS NULL OR user_has_filial_access(filial_id))
  WITH CHECK (is_admin(auth.uid()) OR filial_id IS NULL OR user_has_filial_access(filial_id));