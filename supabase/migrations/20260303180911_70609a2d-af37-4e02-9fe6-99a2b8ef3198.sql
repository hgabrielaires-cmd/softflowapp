
-- =============================================
-- FIX: pedidos, painel_atendimento e tabelas relacionadas
-- Converter role-based de RESTRICTIVE para PERMISSIVE
-- Adicionar gestor/operacional
-- =============================================

-- ==================== PEDIDOS ====================
-- Check existing policies - need to fix role-based ones
-- Keep: "Filial filter pedidos" (RESTRICTIVE)
-- The pedidos table likely has similar issues

-- First check what policies exist and drop role-based ones
DROP POLICY IF EXISTS "Admin gerencia pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Financeiro gerencia pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Vendedor gerencia seus pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Vendedor visualiza seus pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Tecnico visualiza pedidos" ON public.pedidos;

-- Recreate as PERMISSIVE
CREATE POLICY "Admin gerencia pedidos"
  ON public.pedidos FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor gerencia pedidos"
  ON public.pedidos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Financeiro gerencia pedidos"
  ON public.pedidos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role))
  WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Operacional visualiza pedidos"
  ON public.pedidos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Tecnico visualiza pedidos"
  ON public.pedidos FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Vendedor gerencia seus pedidos"
  ON public.pedidos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role) AND vendedor_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'vendedor'::app_role) AND vendedor_id = auth.uid());

-- ==================== PAINEL_ATENDIMENTO ====================
DROP POLICY IF EXISTS "Admin gerencia painel_atendimento" ON public.painel_atendimento;
DROP POLICY IF EXISTS "Autenticados visualizam painel_atendimento" ON public.painel_atendimento;
DROP POLICY IF EXISTS "Operacional atualiza painel_atendimento" ON public.painel_atendimento;
DROP POLICY IF EXISTS "Tecnico atualiza painel_atendimento" ON public.painel_atendimento;

CREATE POLICY "Admin gerencia painel_atendimento"
  ON public.painel_atendimento FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor gerencia painel_atendimento"
  ON public.painel_atendimento FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional gerencia painel_atendimento"
  ON public.painel_atendimento FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Tecnico visualiza e atualiza painel_atendimento"
  ON public.painel_atendimento FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Tecnico atualiza painel_atendimento"
  ON public.painel_atendimento FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Financeiro visualiza painel_atendimento"
  ON public.painel_atendimento FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Vendedor visualiza painel_atendimento"
  ON public.painel_atendimento FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

-- ==================== PAINEL_CHECKLIST_PROGRESSO ====================
DROP POLICY IF EXISTS "Admin gerencia painel_checklist_progresso" ON public.painel_checklist_progresso;
DROP POLICY IF EXISTS "Autenticados visualizam painel_checklist_progresso" ON public.painel_checklist_progresso;
DROP POLICY IF EXISTS "Operacional gerencia painel_checklist_progresso" ON public.painel_checklist_progresso;
DROP POLICY IF EXISTS "Tecnico gerencia painel_checklist_progresso" ON public.painel_checklist_progresso;

CREATE POLICY "Admin gerencia painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor gerencia painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional gerencia painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role))
  WITH CHECK (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Tecnico gerencia painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role))
  WITH CHECK (has_role(auth.uid(), 'tecnico'::app_role));

CREATE POLICY "Financeiro visualiza painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'financeiro'::app_role));

CREATE POLICY "Vendedor visualiza painel_checklist_progresso"
  ON public.painel_checklist_progresso FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'vendedor'::app_role));

-- ==================== PAINEL_AGENDAMENTOS ====================
DROP POLICY IF EXISTS "Authenticated users can delete agendamentos" ON public.painel_agendamentos;
DROP POLICY IF EXISTS "Authenticated users can insert agendamentos" ON public.painel_agendamentos;
DROP POLICY IF EXISTS "Authenticated users can update agendamentos" ON public.painel_agendamentos;
DROP POLICY IF EXISTS "Authenticated users can view agendamentos" ON public.painel_agendamentos;

CREATE POLICY "Autenticados gerenciam agendamentos"
  ON public.painel_agendamentos FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==================== PAINEL_COMENTARIOS ====================
DROP POLICY IF EXISTS "Admin deleta painel_comentarios" ON public.painel_comentarios;
DROP POLICY IF EXISTS "Autenticados inserem painel_comentarios" ON public.painel_comentarios;
DROP POLICY IF EXISTS "Autenticados visualizam painel_comentarios" ON public.painel_comentarios;

CREATE POLICY "Autenticados gerenciam painel_comentarios"
  ON public.painel_comentarios FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==================== PAINEL_APONTAMENTOS ====================
DROP POLICY IF EXISTS "Admin gerencia apontamentos" ON public.painel_apontamentos;
DROP POLICY IF EXISTS "Autenticados deletam apontamentos" ON public.painel_apontamentos;
DROP POLICY IF EXISTS "Autenticados visualizam apontamentos" ON public.painel_apontamentos;
DROP POLICY IF EXISTS "Operacional gerencia apontamentos" ON public.painel_apontamentos;
DROP POLICY IF EXISTS "Tecnico insere apontamentos" ON public.painel_apontamentos;

CREATE POLICY "Autenticados gerenciam apontamentos"
  ON public.painel_apontamentos FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==================== PAINEL_CURTIDAS ====================
DROP POLICY IF EXISTS "Autenticados inserem curtidas" ON public.painel_curtidas;
DROP POLICY IF EXISTS "Autenticados visualizam curtidas" ON public.painel_curtidas;
DROP POLICY IF EXISTS "Usuarios deletam suas curtidas" ON public.painel_curtidas;

CREATE POLICY "Autenticados gerenciam curtidas"
  ON public.painel_curtidas FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ==================== PAINEL_ALERTAS_ENVIADOS ====================
DROP POLICY IF EXISTS "Admin gerencia painel_alertas_enviados" ON public.painel_alertas_enviados;

CREATE POLICY "Admin gerencia painel_alertas_enviados"
  ON public.painel_alertas_enviados FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Gestor visualiza painel_alertas_enviados"
  ON public.painel_alertas_enviados FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional visualiza painel_alertas_enviados"
  ON public.painel_alertas_enviados FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role));
