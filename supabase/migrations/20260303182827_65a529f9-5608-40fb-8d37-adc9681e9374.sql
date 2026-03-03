
-- Fix profiles SELECT policy: all authenticated users should be able to read profiles
-- This is needed for JOINs in Agenda, Painel, etc. to show technician names/avatars
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
CREATE POLICY "Autenticados visualizam profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
