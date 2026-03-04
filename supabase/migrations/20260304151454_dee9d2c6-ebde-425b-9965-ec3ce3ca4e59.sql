
-- Drop and recreate policies correctly
DROP POLICY IF EXISTS "Admin gerencia usuario_mesas" ON public.usuario_mesas;
DROP POLICY IF EXISTS "Usuario visualiza suas mesas" ON public.usuario_mesas;

-- Admin full access (RESTRICTIVE)
CREATE POLICY "Admin gerencia usuario_mesas"
ON public.usuario_mesas
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Users can read their own mesa associations (RESTRICTIVE)
CREATE POLICY "Usuario visualiza suas mesas"
ON public.usuario_mesas
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
