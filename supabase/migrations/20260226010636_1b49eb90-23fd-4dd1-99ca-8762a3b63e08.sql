-- Allow users to delete notifications destined to them
CREATE POLICY "Usuarios deletam suas notificacoes"
ON public.notificacoes
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    destinatario_user_id = auth.uid()
    OR (destinatario_user_id IS NULL AND destinatario_role IS NULL)
  )
);