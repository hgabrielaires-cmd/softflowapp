-- Add PERMISSIVE policy for admin to manage usuario_mesas (INSERT/UPDATE/DELETE)
-- Currently only RESTRICTIVE exists, which blocks even admins due to missing PERMISSIVE
CREATE POLICY "Admin permissive usuario_mesas"
  ON public.usuario_mesas
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
