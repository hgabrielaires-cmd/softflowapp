DROP POLICY "Filial filter painel_agendamentos" ON public.painel_agendamentos;

CREATE POLICY "Filial filter painel_agendamentos" ON public.painel_agendamentos
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  card_id IS NULL
  OR EXISTS (
    SELECT 1 FROM painel_atendimento pa
    WHERE pa.id = painel_agendamentos.card_id
    AND user_has_filial_access(pa.filial_id)
  )
)
WITH CHECK (
  card_id IS NULL
  OR EXISTS (
    SELECT 1 FROM painel_atendimento pa
    WHERE pa.id = painel_agendamentos.card_id
    AND user_has_filial_access(pa.filial_id)
  )
);