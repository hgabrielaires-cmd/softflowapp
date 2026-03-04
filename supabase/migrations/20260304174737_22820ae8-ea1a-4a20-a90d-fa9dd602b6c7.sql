
-- Drop the restrictive user policy that blocks admin from seeing other users' mesas
DROP POLICY IF EXISTS "Usuario visualiza suas mesas" ON public.usuario_mesas;

-- Recreate as PERMISSIVE so it doesn't conflict with admin policy
CREATE POLICY "Usuario visualiza suas mesas"
ON public.usuario_mesas
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));
