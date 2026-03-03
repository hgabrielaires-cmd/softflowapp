
-- Allow all authenticated users to insert notifications (for mentions, likes, replies, etc.)
CREATE POLICY "Autenticados inserem notificacoes"
  ON public.notificacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
