
-- Fix: Admin policy is RESTRICTIVE ALL which blocks non-admin INSERTs
-- Change it to PERMISSIVE so it doesn't block other users
DROP POLICY IF EXISTS "Admin gerencia notificacoes" ON public.notificacoes;
CREATE POLICY "Admin gerencia notificacoes"
  ON public.notificacoes
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
