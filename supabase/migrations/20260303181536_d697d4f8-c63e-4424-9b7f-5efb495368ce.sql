
-- Fix pedido_comentarios: add gestor, operacional, tecnico access
CREATE POLICY "Gestor gerencia pedido_comentarios"
  ON public.pedido_comentarios FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional visualiza pedido_comentarios"
  ON public.pedido_comentarios FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Tecnico visualiza pedido_comentarios"
  ON public.pedido_comentarios FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role));

-- Also fix pedido_curtidas
CREATE POLICY "Gestor gerencia pedido_curtidas"
  ON public.pedido_curtidas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Operacional visualiza pedido_curtidas"
  ON public.pedido_curtidas FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operacional'::app_role));

CREATE POLICY "Tecnico visualiza pedido_curtidas"
  ON public.pedido_curtidas FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'tecnico'::app_role));
