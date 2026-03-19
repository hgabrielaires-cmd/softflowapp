CREATE POLICY "Financeiro atualiza painel_atendimento"
ON public.painel_atendimento
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'financeiro'::app_role))
WITH CHECK (has_role(auth.uid(), 'financeiro'::app_role));